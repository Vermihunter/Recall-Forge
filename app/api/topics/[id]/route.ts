import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { topics } from "@/db/schema";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  if (body.parentTopicId && String(body.parentTopicId) === id) {
    return NextResponse.json({ error: "A topic cannot be its own parent." }, { status: 400 });
  }
  const patch: any = { updatedAt: new Date() };
  for (const key of ["slug", "title", "track", "summary", "stage"] as const) if (body[key] !== undefined) patch[key] = String(body[key]);
  for (const key of ["order", "progress"] as const) if (body[key] !== undefined) patch[key] = Number(body[key]);
  if (body.parentTopicId !== undefined) patch.parentTopicId = body.parentTopicId ? String(body.parentTopicId) : null;
  if (body.mustKnow !== undefined) patch.mustKnow = Array.isArray(body.mustKnow) ? body.mustKnow.map(String) : [];
  const [topic] = await db.update(topics).set(patch).where(eq(topics.id, id)).returning();
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  return NextResponse.json(topic);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [topic] = await db.delete(topics).where(eq(topics.id, id)).returning();
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
