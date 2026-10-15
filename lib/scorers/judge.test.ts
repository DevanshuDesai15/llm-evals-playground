import { describe, expect, it, vi } from "vitest";
import { judge, type JudgeGen } from "./judge";

const verdict = (passed: boolean) =>
  vi.fn<JudgeGen>(async () => ({ passed, reasoning: "because", costUsd: 0.004 }));

describe("judge", () => {
  it("returns the judge's verdict and reasoning", async () => {
    const r = await judge("q", "an answer", "be polite", verdict(true));
    expect(r).toEqual({ passed: true, reasoning: "because", costUsd: 0.004 });
    expect((await judge("q", "an answer", "be polite", verdict(false))).passed).toBe(false);
  });

  it("puts question, reply and rubric in delimited blocks", async () => {
    const gen = verdict(true);
    await judge("the question", "the reply", "the rubric", gen);
    const prompt = gen.mock.calls[0][1];
    expect(prompt).toContain("<question>\nthe question\n</question>");
    expect(prompt).toContain("<reply>\nthe reply\n</reply>");
    expect(prompt).toContain("<rubric>\nthe rubric\n</rubric>");
  });

  it("fails empty or missing output without calling the judge", async () => {
    const gen = verdict(true);
    for (const a of ["", "  \n", null]) expect((await judge("q", a, "r", gen)).passed).toBe(false);
    expect(gen).not.toHaveBeenCalled();
  });

  it("fails a case with no rubric without calling the judge", async () => {
    const gen = verdict(true);
    expect((await judge("q", "a", null, gen)).passed).toBe(false);
    expect(gen).not.toHaveBeenCalled();
  });
});
