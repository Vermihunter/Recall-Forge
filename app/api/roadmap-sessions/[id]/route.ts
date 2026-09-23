import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { roadmapSessions } from "@/db/schema";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const patch: any = { updatedAt: new Date() };
  for (const key of ["slug", "title", "objective", "status", "notes"] as const) if (body[key] !== undefined) patch[key] = String(body[key]);
  if (body.plannedFor !== undefined) patch.plannedFor = body.plannedFor ? String(body.plannedFor) : null;
  for (const key of ["order", "estimatedMinutes", "planOrder"] as const) if (body[key] !== undefined) patch[key] = Number(body[key]);
  if (body.scope !== undefined) patch.scope = Array.isArray(body.scope) ? body.scope.map(String) : [];
  if (body.outcomes !== undefined) patch.outcomes = Array.isArray(body.outcomes) ? body.outcomes.map(String) : [];
  const [session] = await db.update(roadmapSessions).set(patch).where(eq(roadmapSessions.id, id)).returning();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [session] = await db.delete(roadmapSessions).where(eq(roadmapSessions.id, id)).returning();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
