import { describe, expect, it } from "vitest";
import { scoreDeterministic as s } from "./deterministic";

const schema = JSON.stringify({
  type: "object",
  required: ["plan", "price"],
  properties: { plan: { type: "string" }, price: { const: 79 } },
});

describe("exact", () => {
  it("ignores case, whitespace and a trailing period", () => {
    expect(s("exact", "7", " 7. \n")?.passed).toBe(true);
    expect(s("exact", "Yes", "yes")?.passed).toBe(true);
  });
  it("fails on extra words or a different value", () => {
    expect(s("exact", "7", "It is 7 days")?.passed).toBe(false);
    expect(s("exact", "29", "$29")?.passed).toBe(false);
  });
});

describe("contains", () => {
  it("is case-insensitive", () => expect(s("contains", "Cancel plan", "Click cancel PLAN now")?.passed).toBe(true));
  it("fails when missing", () => expect(s("contains", "Invoices", "Go to billing")?.passed).toBe(false));
});

describe("regex", () => {
  it("matches alternatives", () => {
    expect(s("regex", "60\\s*minutes|1\\s*hour", "valid for 60 minutes")?.passed).toBe(true);
    expect(s("regex", "60\\s*minutes|1\\s*hour", "valid for 1 hour")?.passed).toBe(true);
  });
  it("fails on no match", () => expect(s("regex", "60\\s*minutes", "30 minutes")?.passed).toBe(false));
  it("fails (not throws) on an invalid regex", () => expect(s("regex", "(", "x")?.passed).toBe(false));
});

describe("json_schema", () => {
  it("passes valid JSON", () => expect(s("json_schema", schema, '{"plan":"Team","price":79}')?.passed).toBe(true));
  it("accepts a ```json fence", () =>
    expect(s("json_schema", schema, '```json\n{"plan":"Team","price":79}\n```')?.passed).toBe(true));
  it("fails prose around the JSON", () =>
    expect(s("json_schema", schema, 'Sure! {"plan":"Team","price":79}')?.passed).toBe(false));
  it("fails a schema violation (wrong value, missing key)", () => {
    expect(s("json_schema", schema, '{"plan":"Team","price":80}')?.passed).toBe(false);
    expect(s("json_schema", schema, '{"plan":"Team"}')?.passed).toBe(false);
  });
  it("fails (not throws) on a broken schema", () => expect(s("json_schema", "{not json", "{}")?.passed).toBe(false));
});

describe("edge cases", () => {
  it.each(["exact", "contains", "regex", "json_schema"] as const)("%s fails on empty or null output", (t) => {
    expect(s(t, "x", "")?.passed).toBe(false);
    expect(s(t, "x", "  \n")?.passed).toBe(false);
    expect(s(t, "x", null)?.passed).toBe(false);
  });
  it("returns null for judge cases", () => expect(s("judge", null, "anything")).toBeNull());
});
