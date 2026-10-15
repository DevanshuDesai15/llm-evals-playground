import { eq } from "drizzle-orm";
import PQueue from "p-queue";
import { db } from "@/db";
import { runResults, runs } from "@/db/schema";
import { callModel, safeCall, type TestCase, type Variant } from "./call";

export async function createRun(): Promise<number> {
  const [run] = await db.insert(runs).values({ status: "running" }).returning();
  return run.id;
}

export async function runAll(opts: Parameters<typeof executeRun>[1]): Promise<number> {
  const runId = await createRun();
  await executeRun(runId, opts);
  return runId;
}

// Fans out case x variant calls under a concurrency cap and writes each result as it lands.
// `beforeDone` (e.g. scoring) runs after all calls, before status flips to done.
export async function executeRun(
  runId: number,
  {
    cases,
    variants,
    concurrency = 5,
    call = callModel,
    beforeDone,
  }: {
    cases: TestCase[];
    variants: Variant[];
    concurrency?: number;
    call?: typeof callModel;
    beforeDone?: (runId: number) => Promise<unknown>;
  },
): Promise<void> {
  const run = { id: runId };
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
    await beforeDone?.(run.id);
    await db.update(runs).set({ status: "done", finishedAt: new Date() }).where(eq(runs.id, run.id));
  } catch (e) {
    await db.update(runs).set({ status: "failed", finishedAt: new Date() }).where(eq(runs.id, run.id));
    throw e;
  }
}
