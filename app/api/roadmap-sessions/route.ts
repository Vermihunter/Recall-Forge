import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { roadmapSessions } from "@/db/schema";

export async function GET(req: Request) {
  const topicId = new URL(req.url).searchParams.get("topicId");
  const query = db.select().from(roadmapSessions);
  const rows = topicId
    ? await query.where(eq(roadmapSessions.topicId, topicId)).orderBy(asc(roadmapSessions.order))
    : await query.orderBy(asc(roadmapSessions.order));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [session] = await db.insert(roadmapSessions).values({
    topicId: String(body.topicId),
    slug: String(body.slug || "").trim(),
    title: String(body.title || "").trim(),
    order: Number(body.order || 0),
    objective: String(body.objective || ""),
    scope: Array.isArray(body.scope) ? body.scope.map(String) : [],
    outcomes: Array.isArray(body.outcomes) ? body.outcomes.map(String) : [],
    estimatedMinutes: Number(body.estimatedMinutes || 45),
    status: String(body.status || "todo"),
    notes: String(body.notes || ""),
    isSeed: false,
    updatedAt: new Date(),
  }).returning();
  return NextResponse.json(session, { status: 201 });
}
