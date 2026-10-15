import { after } from "next/server";
import { db } from "@/db";
import { testCases, variants } from "@/db/schema";
import { createRun, executeRun } from "@/lib/runner";
import { scoreRun } from "@/lib/scoring";

// ponytail: whole run in one invocation via after(); fine for ~40 calls, chunk across invocations if cases grow
export const maxDuration = 300;

export async function POST() {
  const [cases, vs] = await Promise.all([db.select().from(testCases), db.select().from(variants)]);
  if (!cases.length || !vs.length) return Response.json({ error: "no cases or variants; run npm run seed" }, { status: 400 });
  const id = await createRun();
  after(() => executeRun(id, { cases, variants: vs, beforeDone: scoreRun }).catch((e) => console.error(`run ${id} failed`, e)));
  return Response.json({ id }, { status: 201 });
}
