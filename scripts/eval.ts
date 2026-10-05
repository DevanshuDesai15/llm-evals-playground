import { eq } from "drizzle-orm";
import { db } from "@/db";
import { runResults, testCases, variants } from "@/db/schema";
import { runAll } from "@/lib/runner";

// T3: run everything and print a summary. T5 turns this into the scored table.
async function main() {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY missing in .env.local");
  const [cases, vs] = await Promise.all([db.select().from(testCases), db.select().from(variants)]);
  console.log(`running ${cases.length} cases x ${vs.length} variants...`);
  const runId = await runAll({ cases, variants: vs });

  const rows = await db.select().from(runResults).where(eq(runResults.runId, runId));
  const lat = rows.map((r) => r.latencyMs).filter((n): n is number => n != null).sort((a, b) => a - b);
  const pct = (p: number) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
  const cost = rows.reduce((s, r) => s + Number(r.costUsd ?? 0), 0);
  console.log(
    `run ${runId}: ${rows.length} results, ${rows.filter((r) => r.error).length} errors, ` +
      `p50 ${pct(0.5)}ms, p95 ${pct(0.95)}ms, cost $${cost.toFixed(5)}`,
  );
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
