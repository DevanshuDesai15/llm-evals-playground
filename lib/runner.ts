import { eq } from "drizzle-orm";
import PQueue from "p-queue";
import { db } from "@/db";
import { runResults, runs } from "@/db/schema";
import { callModel, safeCall, type TestCase, type Variant } from "./call";

// Fans out case x variant calls under a concurrency cap and writes each result as it lands.
export async function runAll({
  cases,
  variants,
  concurrency = 5,
  call = callModel,
}: {
  cases: TestCase[];
  variants: Variant[];
  concurrency?: number;
  call?: typeof callModel;
}): Promise<number> {
  const [run] = await db.insert(runs).values({ status: "running" }).returning();
  const queue = new PQueue({ concurrency });
  try {
    await queue.addAll(
      cases.flatMap((c) =>
        variants.map((v) => async () => {
          const r = await safeCall(call, v, c);
          await db.insert(runResults).values({
            runId: run.id,
            caseId: c.id,
            variantId: v.id,
            // snapshot, so editing the variant later doesn't rewrite this run
            variantConfig: {
              model: v.model,
              systemPrompt: v.systemPrompt,
              temperature: v.temperature,
              maxTokens: v.maxTokens,
            },
            output: r.output,
            latencyMs: r.latencyMs,
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
            costUsd: r.costUsd?.toString(),
            error: r.error,
          });
        }),
      ),
    );
    await db.update(runs).set({ status: "done", finishedAt: new Date() }).where(eq(runs.id, run.id));
  } catch (e) {
    await db.update(runs).set({ status: "failed", finishedAt: new Date() }).where(eq(runs.id, run.id));
    throw e;
  }
  return run.id;
}
