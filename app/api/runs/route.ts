import { inArray } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { testCases, variants } from "@/db/schema";
import { createRun, executeRun } from "@/lib/runner";
import { scoreRun } from "@/lib/scoring";

// ponytail: whole run in one invocation via after(); fine for ~40 calls, chunk across invocations if cases grow
export const maxDuration = 300;

const body = z.object({ variantIds: z.array(z.number().int()).optional() });

export async function POST(req: Request) {
  const p = body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return Response.json({ error: "bad body" }, { status: 400 });
  const ids = p.data.variantIds;
  const [cases, vs] = await Promise.all([
    db.select().from(testCases),
    ids ? db.select().from(variants).where(inArray(variants.id, ids)) : db.select().from(variants),
  ]);
  if (!cases.length || !vs.length) return Response.json({ error: "no cases or variants selected" }, { status: 400 });
  const id = await createRun();
  after(() => executeRun(id, { cases, variants: vs, beforeDone: scoreRun }).catch((e) => console.error(`run ${id} failed`, e)));
  return Response.json({ id }, { status: 201 });
}
