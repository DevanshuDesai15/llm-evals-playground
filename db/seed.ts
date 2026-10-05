import { readFileSync } from "node:fs";
import { count } from "drizzle-orm";
import { db } from "./index";
import { testCases, variants, type CheckType } from "./schema";

type SeedCase = {
  input: string;
  checkType: CheckType;
  expected?: string | object;
  rubric?: string;
  tags: string[];
};

const cases: SeedCase[] = JSON.parse(readFileSync("data/cases.json", "utf8"));
const policy = readFileSync("data/policy.md", "utf8");

async function main() {
  // idempotent: cases are matched by input text, the variant by its unique name
  const have = new Set((await db.select({ input: testCases.input }).from(testCases)).map((r) => r.input));
  const fresh = cases
    .filter((c) => !have.has(c.input))
    .map((c) => ({
      ...c,
      // json_schema cases keep the schema as an object in cases.json
      expected: typeof c.expected === "object" ? JSON.stringify(c.expected) : c.expected,
    }));
  if (fresh.length) await db.insert(testCases).values(fresh);

  // same model + prompt, only the token budget differs: the flash model reasons before
  // answering, so 512 can be eaten entirely by thinking and leave an empty reply
  const base = { model: "deepseek/deepseek-v4.1-flash", systemPrompt: policy, temperature: 0 };
  await db
    .insert(variants)
    .values([
      { ...base, name: "deepseek-flash-baseline", maxTokens: 512 },
      { ...base, name: "deepseek-flash-2048", maxTokens: 2048 },
    ])
    .onConflictDoNothing({ target: variants.name });

  const [c] = await db.select({ n: count() }).from(testCases);
  const [v] = await db.select({ n: count() }).from(variants);
  console.log(`inserted ${fresh.length} cases | totals: ${c.n} cases, ${v.n} variants`);
}

main();
