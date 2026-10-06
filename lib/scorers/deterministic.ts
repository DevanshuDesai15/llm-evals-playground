import Ajv from "ajv";
import type { CheckType } from "@/db/schema";

export type Score = { scorer: CheckType; passed: boolean; score: number; reasoning: string };

const ajv = new Ajv();
const fail = (scorer: CheckType, reasoning: string): Score => ({ scorer, passed: false, score: 0, reasoning });
const pass = (scorer: CheckType, reasoning: string): Score => ({ scorer, passed: true, score: 1, reasoning });

// Models often wrap JSON in ```json fences even when told not to. We accept the fence and
// judge the content, so the schema check measures structure, not markdown habits.
const unfence = (s: string) => s.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");

// Returns null for "judge" cases: those are graded by the LLM judge, not here.
export function scoreDeterministic(checkType: CheckType, expected: string | null, output: string | null): Score | null {
  if (checkType === "judge") return null;
  if (!output?.trim()) return fail(checkType, "empty output");
  if (expected == null) return fail(checkType, "test case has no expected value");

  switch (checkType) {
    case "exact": {
      const norm = (s: string) => s.trim().toLowerCase().replace(/\.$/, "");
      return norm(output) === norm(expected)
        ? pass("exact", "matches expected")
        : fail("exact", `expected "${expected}", got "${output.trim().slice(0, 80)}"`);
    }
    case "contains":
      return output.toLowerCase().includes(expected.toLowerCase())
        ? pass("contains", `contains "${expected}"`)
        : fail("contains", `missing "${expected}"`);
    case "regex": {
      try {
        return new RegExp(expected, "i").test(output)
          ? pass("regex", `matches /${expected}/i`)
          : fail("regex", `no match for /${expected}/i`);
      } catch {
        return fail("regex", `invalid regex /${expected}/ in test case`);
      }
    }
    case "json_schema": {
      let data: unknown;
      try {
        data = JSON.parse(unfence(output));
      } catch {
        return fail("json_schema", "output is not valid JSON");
      }
      try {
        const validate = ajv.compile(JSON.parse(expected));
        return validate(data) ? pass("json_schema", "valid against schema") : fail("json_schema", ajv.errorsText(validate.errors));
      } catch {
        return fail("json_schema", "invalid schema in test case");
      }
    }
  }
}
