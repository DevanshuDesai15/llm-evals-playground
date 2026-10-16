import { eq } from "drizzle-orm";
import { db } from "@/db";
import { variants } from "@/db/schema";
import { errMsg, variantBody } from "@/lib/variant-schema";

export async function PUT(req: Request, { params }: RouteContext<"/api/variants/[id]">) {
  const id = Number((await params).id);
  const p = variantBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: p.error.issues.map((i) => `${i.path}: ${i.message}`).join("; ") }, { status: 400 });
  try {
    // past runs keep their own variantConfig snapshot, so editing is safe
    const [row] = await db.update(variants).set(p.data).where(eq(variants.id, id)).returning();
    return row ? Response.json(row) : Response.json({ error: "not found" }, { status: 404 });
  } catch (e) {
    const m = errMsg(e);
    if (m) return Response.json({ error: m }, { status: 409 });
    throw e;
  }
}

// note: run_results cascade, so deleting a variant also deletes its results in past runs
export async function DELETE(_req: Request, { params }: RouteContext<"/api/variants/[id]">) {
  const id = Number((await params).id);
  const [row] = await db.delete(variants).where(eq(variants.id, id)).returning({ id: variants.id });
  return row ? Response.json(row) : Response.json({ error: "not found" }, { status: 404 });
}
