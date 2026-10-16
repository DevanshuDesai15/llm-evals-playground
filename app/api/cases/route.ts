import { desc } from "drizzle-orm";
import { db } from "@/db";
import { testCases } from "@/db/schema";
import { caseBody } from "@/lib/case-schema";

export async function GET() {
  return Response.json(await db.select().from(testCases).orderBy(desc(testCases.id)));
}

export async function POST(req: Request) {
  const p = caseBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: p.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  const [row] = await db.insert(testCases).values(p.data).returning();
  return Response.json(row, { status: 201 });
}
