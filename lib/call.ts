import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { testCases, variants } from "@/db/schema";

export type Variant = typeof variants.$inferSelect;
export type TestCase = typeof testCases.$inferSelect;

export type CallResult = {
  output: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
};

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

export async function callModel(v: Variant, input: string): Promise<CallResult> {
  const start = performance.now();
  const r = await generateText({
    // usage.include makes OpenRouter report the real cost, so no price table to maintain
    model: openrouter(v.model, { usage: { include: true } }),
    system: v.systemPrompt || undefined,
    prompt: input,
    temperature: v.temperature,
    maxOutputTokens: v.maxTokens,
    maxRetries: 3, // SDK retries 429/5xx with backoff
  });
  const usage = r.providerMetadata?.openrouter?.usage as { cost?: number } | undefined;
  return {
    output: r.text,
    latencyMs: Math.round(performance.now() - start),
    inputTokens: r.usage.inputTokens ?? 0,
    outputTokens: r.usage.outputTokens ?? 0,
    costUsd: usage?.cost ?? null,
  };
}

// One failed call must not abort the run: turn it into a row with `error` set.
export async function safeCall(
  call: typeof callModel,
  v: Variant,
  c: TestCase,
): Promise<Partial<CallResult> & { error?: string }> {
  try {
    return await call(v, c.input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
