import { z } from "zod";
import { CHECK_TYPES } from "@/db/schema";

const blank = (s?: string | null) => s?.trim() || null;

export const caseBody = z
  .object({
    input: z.string().trim().min(1),
    checkType: z.enum(CHECK_TYPES),
    expected: z.string().nullish().transform(blank),
    rubric: z.string().nullish().transform(blank),
    tags: z.array(z.string().trim().min(1)).default([]),
  })
  .refine((c) => c.checkType === "judge" || c.expected, { message: "expected is required for code checks", path: ["expected"] })
  .refine((c) => c.checkType !== "judge" || c.rubric, { message: "rubric is required for judge checks", path: ["rubric"] });
