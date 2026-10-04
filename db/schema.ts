import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// How a case is scored. "judge" = open-ended, graded by the LLM against `rubric`.
export const CHECK_TYPES = ["exact", "contains", "regex", "json_schema", "judge"] as const;
export type CheckType = (typeof CHECK_TYPES)[number];

export const testCases = pgTable("test_cases", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  input: text().notNull(),
  // expected string / regex / JSON schema, depending on checkType
  expected: text(),
  checkType: text("check_type").$type<CheckType>().notNull().default("judge"),
  rubric: text(),
  tags: text().array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const variants = pgTable("variants", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
  model: text().notNull(), // OpenRouter slug
  systemPrompt: text("system_prompt").notNull().default(""),
  temperature: real().notNull().default(0),
  maxTokens: integer("max_tokens").notNull().default(512),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const runs = pgTable("runs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  status: text().$type<"pending" | "running" | "done" | "failed">().notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const runResults = pgTable(
  "run_results",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    runId: integer("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
    caseId: integer("case_id").notNull().references(() => testCases.id, { onDelete: "cascade" }),
    variantId: integer("variant_id").notNull().references(() => variants.id, { onDelete: "cascade" }),
    // variant config as it was when the run happened, so editing a variant
    // later doesn't rewrite history in regression diffs
    variantConfig: jsonb("variant_config").notNull(),
    output: text(),
    latencyMs: integer("latency_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    error: text(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("run_results_run_idx").on(t.runId)],
);

// One row per scorer per result: deterministic checks and the judge side by side.
export const scores = pgTable(
  "scores",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    resultId: integer("result_id").notNull().references(() => runResults.id, { onDelete: "cascade" }),
    scorer: text().notNull(), // exact | contains | regex | json_schema | judge
    passed: boolean().notNull(),
    score: real().notNull(), // 0..1
    reasoning: text(), // judge explanation
  },
  (t) => [index("scores_result_idx").on(t.resultId)],
);
