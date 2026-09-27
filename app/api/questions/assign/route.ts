import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions, roadmapSessions, topics } from "@/db/schema";

export async function POST(req: Request) {
  const body = await req.json();
  const ids = Array.from(new Set<string>((Array.isArray(body.questionIds) ? body.questionIds : []).map(String).filter(Boolean)));
  const sessionSlug = String(body.sessionSlug || "").trim();
  if (!ids.length || !sessionSlug) return NextResponse.json({ error: "Choose questions and a target roadmap session." }, { status: 400 });

  const rows = await db.select({ sessionSlug: roadmapSessions.slug, topicSlug: topics.slug })
    .from(roadmapSessions)
    .innerJoin(topics, eq(roadmapSessions.topicId, topics.id))
    .where(eq(roadmapSessions.slug, sessionSlug))
    .limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Target roadmap session was not found." }, { status: 404 });

  const updated = await db.update(questions)
    .set({ sessionSlug: rows[0].sessionSlug, topicSlug: rows[0].topicSlug, updatedAt: new Date() })
    .where(inArray(questions.id, ids))
    .returning({ id: questions.id });

  return NextResponse.json({ updated: updated.length, sessionSlug: rows[0].sessionSlug, topicSlug: rows[0].topicSlug });
}
