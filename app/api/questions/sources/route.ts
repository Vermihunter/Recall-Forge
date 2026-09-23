import { asc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions, roadmapSessions, topics } from "@/db/schema";

export async function GET() {
  const [sessionRows, counts] = await Promise.all([
    db.select({
      id: roadmapSessions.id,
      slug: roadmapSessions.slug,
      title: roadmapSessions.title,
      order: roadmapSessions.order,
      status: roadmapSessions.status,
      objective: roadmapSessions.objective,
      scope: roadmapSessions.scope,
      outcomes: roadmapSessions.outcomes,
      topicId: topics.id,
      topicSlug: topics.slug,
      topicTitle: topics.title,
      track: topics.track,
    }).from(roadmapSessions)
      .innerJoin(topics, sql`${roadmapSessions.topicId} = ${topics.id}`)
      .orderBy(asc(topics.track), asc(topics.order), asc(roadmapSessions.order)),
    db.select({ sessionSlug: questions.sessionSlug, count: sql<number>`count(*)::int` })
      .from(questions)
      .groupBy(questions.sessionSlug),
  ]);
  const countBySlug = new Map(counts.map((x) => [x.sessionSlug || "", Number(x.count || 0)]));
  return NextResponse.json(sessionRows.map((row) => ({ ...row, questionCount: countBySlug.get(row.slug) || 0 })));
}
