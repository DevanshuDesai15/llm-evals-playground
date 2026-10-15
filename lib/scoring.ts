import { eq } from "drizzle-orm";
import PQueue from "p-queue";
import { db } from "@/db";
import { runResults, scores, testCases } from "@/db/schema";
import { scoreDeterministic } from "./scorers/deterministic";
import { judge } from "./scorers/judge";

// Scores every not-yet-scored result in a run: code checks inline, judge cases via the LLM.
// Safe to re-run: scored results are skipped, and a failed judge call stores nothing so it retries.
export async function scoreRun(runId: number, judgeConcurrency = 4): Promise<{ scored: number; judgeFailures: number }> {
  const rows = await db
    .select({ result: runResults, c: testCases })
    .from(runResults)
    .innerJoin(testCases, eq(runResults.caseId, testCases.id))
    .where(eq(runResults.runId, runId));
  const scored = new Set(
    (await db.select({ id: scores.resultId }).from(scores).innerJoin(runResults, eq(scores.resultId, runResults.id)).where(eq(runResults.runId, runId))).map((r) => r.id),
  );
  const todo = rows.filter(({ result }) => !scored.has(result.id));

  const code = todo.flatMap(({ result, c }) => {
    const s = scoreDeterministic(c.checkType, c.expected, result.output);
    return s ? [{ resultId: result.id, scorer: s.scorer, passed: s.passed, score: s.score, reasoning: s.reasoning }] : [];
  });
  if (code.length) await db.insert(scores).values(code);

  let judged = 0;
  let judgeFailures = 0;
  const queue = new PQueue({ concurrency: judgeConcurrency });
  await queue.addAll(
    todo
      .filter(({ c }) => c.checkType === "judge")
      .map(({ result, c }) => async () => {
        try {
          const j = await judge(c.input, result.output, c.rubric);
          await db.insert(scores).values({
            resultId: result.id,
            scorer: "judge",
            passed: j.passed,
            score: j.passed ? 1 : 0,
            reasoning: j.reasoning,
            costUsd: j.costUsd?.toString(),
          });
          judged++;
        } catch (e) {
          judgeFailures++;
          console.warn(`judge failed for result ${result.id}: ${e instanceof Error ? e.message : e}`);
        }
      }),
  );
  return { scored: code.length + judged, judgeFailures };
}
