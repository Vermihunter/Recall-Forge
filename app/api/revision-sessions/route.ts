import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questionAttempts, questions, revisionSessionItems, revisionSessions, roadmapSessions, topics } from "@/db/schema";
import { rankRecommendations } from "@/lib/recommendations";

function dueScore(q: any) {
  const now = Date.now();
  const due = q.nextReviewAt ? new Date(q.nextReviewAt).getTime() <= now : true;
  return (q.repetitions ? 0 : 6) + (due ? 4 : 0) + Math.max(0, 6 - Number(q.difficulty || 1)) * 0.05;
}

export async function GET() {
  const rows = await db.select().from(revisionSessions).orderBy(desc(revisionSessions.updatedAt)).limit(50);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const sourceSessionSlugs = Array.from(new Set((Array.isArray(body.sourceSessionSlugs) ? body.sourceSessionSlugs : []).map(String).filter(Boolean)));
  const explicitQuestionIds = Array.from(new Set((Array.isArray(body.questionIds) ? body.questionIds : []).map(String).filter(Boolean)));
  const targetQuestionCount = Math.max(5, Math.min(100, Number(body.targetQuestionCount || 30)));
  if (!sourceSessionSlugs.length && !explicitQuestionIds.length) return NextResponse.json({ error: "Choose at least one roadmap session or recommended question." }, { status: 400 });

  let selected: any[] = [];
  let origins = new Map<string, string>();

  if (explicitQuestionIds.length) {
    selected = await db.select().from(questions).where(inArray(questions.id, explicitQuestionIds));
    for (const q of selected) origins.set(q.id, "recommended");
  } else {
    const sourceQuestions = await db.select().from(questions).where(inArray(questions.sessionSlug, sourceSessionSlugs));
    const sourceSorted = sourceQuestions.slice().sort((a, b) => dueScore(b) - dueScore(a));

    const sourceRows = await db.select({ slug: roadmapSessions.slug, topicSlug: topics.slug })
      .from(roadmapSessions)
      .innerJoin(topics, eq(roadmapSessions.topicId, topics.id))
      .where(inArray(roadmapSessions.slug, sourceSessionSlugs));
    const topicSlugs = Array.from(new Set(sourceRows.map((x) => x.topicSlug)));
    const neighborhood = topicSlugs.length ? await db.select().from(questions).where(inArray(questions.topicSlug, topicSlugs)) : sourceQuestions;
    const attempts = await db.select().from(questionAttempts).orderBy(desc(questionAttempts.createdAt)).limit(1200);
    // The selected roadmap sessions remain the hard source boundary until we have
    // actual weakness evidence. Only then may a small slice come from graph neighbors.
    const recommendations = rankRecommendations(neighborhood, neighborhood, attempts, Math.max(6, Math.ceil(targetQuestionCount * 0.3)))
      .filter((x) => x.reasons.some((reason) => /weak|prerequisite|neighbor|downstream/i.test(reason)));
    const recIds = new Set(recommendations.map((x) => x.question.id));

    const recommendedQuota = recommendations.length ? Math.min(Math.ceil(targetQuestionCount * 0.25), recommendations.length) : 0;
    const sourceQuota = targetQuestionCount - recommendedQuota;
    selected = sourceSorted.slice(0, sourceQuota);
    for (const q of selected) origins.set(q.id, "source");
    for (const r of recommendations) {
      if (selected.length >= targetQuestionCount) break;
      if (selected.some((q) => q.id === r.question.id)) continue;
      selected.push(r.question);
      origins.set(r.question.id, "recommended");
    }
    for (const q of sourceSorted) {
      if (selected.length >= targetQuestionCount) break;
      if (recIds.has(q.id) && selected.some((x) => x.id === q.id)) continue;
      if (!selected.some((x) => x.id === q.id)) { selected.push(q); origins.set(q.id, "source"); }
    }
  }

  if (!selected.length) return NextResponse.json({ error: "No questions exist for the selected sources yet." }, { status: 400 });
  const [created] = await db.insert(revisionSessions).values({
    name: String(body.name || `Revision · ${sourceSessionSlugs.length || selected.length} sources`).trim(),
    sourceSessionSlugs,
    targetQuestionCount,
    recommendationMode: String(body.recommendationMode || "balanced"),
    status: "active",
    updatedAt: new Date(),
  }).returning();

  await db.insert(revisionSessionItems).values(selected.slice(0, targetQuestionCount).map((q, index) => ({
    revisionSessionId: created.id,
    questionId: q.id,
    position: index,
    origin: origins.get(q.id) || "source",
    status: "pending",
  })));
  return NextResponse.json({ ...created, questionCount: Math.min(selected.length, targetQuestionCount) }, { status: 201 });
}
