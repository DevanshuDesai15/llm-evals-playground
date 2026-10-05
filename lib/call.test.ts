import { describe, expect, it } from "vitest";
import { safeCall, type TestCase, type Variant } from "./call";

const v = { id: 1, model: "m", systemPrompt: "", temperature: 0, maxTokens: 10 } as Variant;
const c = { id: 1, input: "hi" } as TestCase;

describe("safeCall", () => {
  it("passes a successful result through", async () => {
    const ok = { output: "yo", latencyMs: 5, inputTokens: 1, outputTokens: 1, costUsd: 0.001 };
    expect(await safeCall(async () => ok, v, c)).toEqual(ok);
  });

  it("turns a thrown error into an error row instead of rejecting", async () => {
    const r = await safeCall(async () => { throw new Error("429 rate limited"); }, v, c);
    expect(r).toEqual({ error: "429 rate limited" });
  });

  it("stringifies non-Error throws", async () => {
    const r = await safeCall(async () => { throw "boom"; }, v, c);
    expect(r.error).toBe("boom");
  });
});
