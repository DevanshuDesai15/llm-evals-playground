import { eq } from "drizzle-orm";
import { db } from "@/db";
import { testCases } from "@/db/schema";
import { caseBody } from "@/lib/case-schema";

export async function PUT(req: Request, { params }: RouteContext<"/api/cases/[id]">) {
  const id = Number((await params).id);
  const p = caseBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: p.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  const [row] = await db.update(testCases).set(p.data).where(eq(testCases.id, id)).returning();
  return row ? Response.json(row) : Response.json({ error: "not found" }, { status: 404 });
}

// note: run_results cascade, so deleting a case also deletes its history in past runs
export async function DELETE(_req: Request, { params }: RouteContext<"/api/cases/[id]">) {
  const id = Number((await params).id);
  const [row] = await db.delete(testCases).where(eq(testCases.id, id)).returning({ id: testCases.id });
  return row ? Response.json(row) : Response.json({ error: "not found" }, { status: 404 });
}
