import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questionAttempts, questions, revisionSessions, roadmapSessions, topics } from "@/db/schema";
import { rankRecommendations } from "@/lib/recommendations";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const revisionSessionId = url.searchParams.get("revisionSessionId");
  const limit = Math.max(1, Math.min(30, Number(url.searchParams.get("limit") || 10)));
  if (!revisionSessionId) return NextResponse.json({ recommendations: [] });
  const session = (await db.select().from(revisionSessions).where(eq(revisionSessions.id, revisionSessionId)).limit(1))[0];
  if (!session) return NextResponse.json({ error: "Revision session not found" }, { status: 404 });

  const sourceRows = session.sourceSessionSlugs.length ? await db.select({ topicSlug: topics.slug })
    .from(roadmapSessions)
    .innerJoin(topics, eq(roadmapSessions.topicId, topics.id))
    .where(inArray(roadmapSessions.slug, session.sourceSessionSlugs)) : [];
  const topicSlugs = Array.from(new Set(sourceRows.map((x) => x.topicSlug)));
  const candidates = topicSlugs.length ? await db.select().from(questions).where(inArray(questions.topicSlug, topicSlugs)) : [];
  const attempts = await db.select().from(questionAttempts).orderBy(desc(questionAttempts.createdAt)).limit(1500);
  // Keep directly weak questions eligible as well as their graph neighbors. This
  // produces a blend of "retry what failed" and "probe what probably also fails".
  const ranked = rankRecommendations(candidates, candidates, attempts, limit);
  return NextResponse.json({
    recommendations: ranked.map((x) => ({ question: x.question, score: Number(x.score.toFixed(3)), reasons: x.reasons })),
    graph: {
      weakConcepts: Array.from(new Set(ranked.flatMap((x) => x.reasons.filter((r) => r.startsWith("weak-neighbor concepts:")).flatMap((r) => r.replace("weak-neighbor concepts:", "").split(",").map((k) => k.trim()))))).slice(0, 12),
      candidateCount: candidates.length,
    },
  });
}
