import { asc } from "drizzle-orm";
import { db } from "@/db";
import { variants } from "@/db/schema";
import { errMsg, variantBody } from "@/lib/variant-schema";

export async function GET() {
  return Response.json(await db.select().from(variants).orderBy(asc(variants.id)));
}

export async function POST(req: Request) {
  const p = variantBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: p.error.issues.map((i) => `${i.path}: ${i.message}`).join("; ") }, { status: 400 });
  try {
    const [row] = await db.insert(variants).values(p.data).returning();
    return Response.json(row, { status: 201 });
  } catch (e) {
    const m = errMsg(e);
    if (m) return Response.json({ error: m }, { status: 409 });
    throw e;
  }
}
