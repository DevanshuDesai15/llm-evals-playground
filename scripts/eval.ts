import { eq } from "drizzle-orm";
import { db } from "@/db";
import { runResults, scores, testCases, variants } from "@/db/schema";
import { runAll } from "@/lib/runner";
import { scoreRun } from "@/lib/scoring";

// npm run eval          -> new run of every case x variant, then score it (code checks + LLM judge)
// npm run eval -- 3     -> just (re)score and print existing run 3, no model calls except unjudged cases
async function main() {
  let runId = Number(process.argv[2]);
  if (!runId) {
    for (const k of ["OPENROUTER_API_KEY", "JUDGE_MODEL"]) if (!process.env[k]) throw new Error(`${k} missing in .env.local`);
    const [cases, vs] = await Promise.all([db.select().from(testCases), db.select().from(variants)]);
    console.log(`running ${cases.length} cases x ${vs.length} variants...`);
    runId = await runAll({ cases, variants: vs });
  }
  const { scored, judgeFailures } = await scoreRun(runId);
  console.log(`scored ${scored} new results${judgeFailures ? `, ${judgeFailures} judge calls failed (re-run to retry)` : ""}`);

  const rows = await db
    .select({ r: runResults, name: variants.name, scorer: scores.scorer, passed: scores.passed, judgeCost: scores.costUsd })
    .from(runResults)
    .innerJoin(variants, eq(runResults.variantId, variants.id))
    .leftJoin(scores, eq(scores.resultId, runResults.id))
    .where(eq(runResults.runId, runId));

  const rate = (xs: typeof rows) => {
    const ok = xs.filter((x) => x.passed).length;
    return xs.length ? `${ok}/${xs.length} ${((100 * ok) / xs.length).toFixed(0)}%` : "-";
  };
  const pct = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  console.log(`\nrun ${runId}`);
  console.table(
    [...Map.groupBy(rows, (x) => x.name)].map(([name, rs]) => {
      const lat = rs.map((x) => x.r.latencyMs).filter((n): n is number => n != null).sort((a, b) => a - b);
      const scored = rs.filter((x) => x.scorer);
      return {
        variant: name,
        "pass (all)": rate(scored),
        "pass (code)": rate(scored.filter((x) => x.scorer !== "judge")),
        "pass (judge)": rate(scored.filter((x) => x.scorer === "judge")),
        errors: rs.filter((x) => x.r.error).length,
        "p50 ms": pct(lat, 0.5),
        "p95 ms": pct(lat, 0.95),
        "cost $": rs.reduce((s, x) => s + Number(x.r.costUsd ?? 0), 0).toFixed(5),
      };
    }),
  );
  console.log(`judge cost $${rows.reduce((s, x) => s + Number(x.judgeCost ?? 0), 0).toFixed(5)} (${process.env.JUDGE_MODEL})`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
