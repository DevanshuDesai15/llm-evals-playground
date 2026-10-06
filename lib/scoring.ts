import { eq } from "drizzle-orm";
import { db } from "@/db";
import { runResults, scores, testCases } from "@/db/schema";
import { scoreDeterministic } from "./scorers/deterministic";

// Scores every not-yet-scored deterministic result in a run. Safe to re-run.
export async function scoreRun(runId: number): Promise<number> {
  const rows = await db
    .select({ result: runResults, c: testCases })
    .from(runResults)
    .innerJoin(testCases, eq(runResults.caseId, testCases.id))
    .where(eq(runResults.runId, runId));
  const scored = new Set(
    (await db.select({ id: scores.resultId }).from(scores).innerJoin(runResults, eq(scores.resultId, runResults.id)).where(eq(runResults.runId, runId))).map((r) => r.id),
  );

  const values = rows.flatMap(({ result, c }) => {
    if (scored.has(result.id)) return [];
    const s = scoreDeterministic(c.checkType, c.expected, result.output);
    return s ? [{ resultId: result.id, scorer: s.scorer, passed: s.passed, score: s.score, reasoning: s.reasoning }] : [];
  });
  if (values.length) await db.insert(scores).values(values);
  return values.length;
}
