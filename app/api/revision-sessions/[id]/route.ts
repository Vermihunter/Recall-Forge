import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions, revisionSessionItems, revisionSessions } from "@/db/schema";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = (await db.select().from(revisionSessions).where(eq(revisionSessions.id, id)).limit(1))[0];
  if (!session) return NextResponse.json({ error: "Revision session not found" }, { status: 404 });
  const rows = await db.select({ item: revisionSessionItems, question: questions })
    .from(revisionSessionItems)
    .innerJoin(questions, eq(revisionSessionItems.questionId, questions.id))
    .where(eq(revisionSessionItems.revisionSessionId, id))
    .orderBy(asc(revisionSessionItems.position));
  return NextResponse.json({ session, items: rows.map((x) => ({ ...x.item, question: x.question })) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const patch: Record<string, any> = { updatedAt: new Date() };
  if (body.status) patch.status = String(body.status);
  if (body.name) patch.name = String(body.name);
  const [updated] = await db.update(revisionSessions).set(patch).where(eq(revisionSessions.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Revision session not found" }, { status: 404 });
  return NextResponse.json(updated);
}
