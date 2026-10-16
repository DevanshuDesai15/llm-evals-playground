import { eq } from "drizzle-orm";
import { db } from "@/db";
import { runResults, runs, scores, testCases, variants } from "@/db/schema";

export async function GET(_req: Request, { params }: RouteContext<"/api/runs/[id]">) {
  const id = Number((await params).id);
  const [run] = Number.isInteger(id) ? await db.select().from(runs).where(eq(runs.id, id)) : [];
  if (!run) return Response.json({ error: "not found" }, { status: 404 });

  const [rows, sc] = await Promise.all([
    db
      .select({ r: runResults, variant: variants.name, input: testCases.input })
      .from(runResults)
      .innerJoin(variants, eq(runResults.variantId, variants.id))
      .innerJoin(testCases, eq(runResults.caseId, testCases.id))
      .where(eq(runResults.runId, id))
      .orderBy(runResults.id),
    db
      .select({ resultId: scores.resultId, scorer: scores.scorer, passed: scores.passed, reasoning: scores.reasoning })
      .from(scores)
      .innerJoin(runResults, eq(scores.resultId, runResults.id))
      .where(eq(runResults.runId, id)),
  ]);
  return Response.json({
    run,
    results: rows.map(({ r, variant, input }) => ({
      id: r.id,
      variant,
      input,
      output: r.output,
      error: r.error,
      latencyMs: r.latencyMs,
      costUsd: r.costUsd,
      scores: sc.filter((s) => s.resultId === r.id),
    })),
  });
}
