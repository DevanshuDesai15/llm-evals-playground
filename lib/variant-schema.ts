import { z } from "zod";

export const variantBody = z.object({
  name: z.string().trim().min(1),
  model: z.string().trim().min(1), // OpenRouter slug, e.g. openai/gpt-6-luna
  systemPrompt: z.string().default(""),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(32000),
});

export const errMsg = (e: unknown) => {
  const x = e as { code?: string; cause?: { code?: string } };
  return x.code === "23505" || x.cause?.code === "23505" ? "name already exists" : null;
};
