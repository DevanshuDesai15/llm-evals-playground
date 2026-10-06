import { eq } from "drizzle-orm";
import { db } from "@/db";
import { runResults, scores, testCases, variants } from "@/db/schema";
import { runAll } from "@/lib/runner";
import { scoreRun } from "@/lib/scoring";

// npm run eval          -> new run of every case x variant, then score it
// npm run eval -- 3     -> just (re)score and print existing run 3, no API calls
// T5 adds the LLM judge to this table.
async function main() {
  let runId = Number(process.argv[2]);
  if (!runId) {
    if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY missing in .env.local");
    const [cases, vs] = await Promise.all([db.select().from(testCases), db.select().from(variants)]);
    console.log(`running ${cases.length} cases x ${vs.length} variants...`);
    runId = await runAll({ cases, variants: vs });
  }
  console.log(`scored ${await scoreRun(runId)} new results`);

  const rows = await db
    .select({ r: runResults, name: variants.name, passed: scores.passed })
    .from(runResults)
    .innerJoin(variants, eq(runResults.variantId, variants.id))
    .leftJoin(scores, eq(scores.resultId, runResults.id))
    .where(eq(runResults.runId, runId));

  const byVariant = Map.groupBy(rows, (x) => x.name);
  const pct = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  console.log(`\nrun ${runId}`);
  console.table(
    [...byVariant].map(([name, rs]) => {
      const lat = rs.map((x) => x.r.latencyMs).filter((n): n is number => n != null).sort((a, b) => a - b);
      const checked = rs.filter((x) => x.passed != null);
      const ok = checked.filter((x) => x.passed).length;
      return {
        variant: name,
        "pass (deterministic)": `${ok}/${checked.length} ${((100 * ok) / checked.length).toFixed(0)}%`,
        errors: rs.filter((x) => x.r.error).length,
        "p50 ms": pct(lat, 0.5),
        "p95 ms": pct(lat, 0.95),
        "cost $": rs.reduce((s, x) => s + Number(x.r.costUsd ?? 0), 0).toFixed(5),
      };
    }),
  );
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
