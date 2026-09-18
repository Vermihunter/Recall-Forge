import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";

const allowed = new Set(["recall", "explain", "compare", "application", "debug", "design", "cross_topic", "misconception"]);

export async function POST(req: Request) {
  const body = await req.json();
  const items = Array.isArray(body) ? body : body.questions;
  if (!Array.isArray(items)) return NextResponse.json({ error: "Expected an array or { questions: [...] }" }, { status: 400 });

  const docs = items.map((q: any, idx: number) => ({
    externalId: q.id || q.externalId || `import-${Date.now()}-${idx}`,
    topicSlug: String(q.topic || q.topicSlug || "general"),
    sessionSlug: q.session || q.sessionSlug || null,
    subtopics: Array.isArray(q.subtopics) ? q.subtopics.map(String) : [],
    prerequisites: Array.isArray(q.prerequisites) ? q.prerequisites.map(String) : [],
    type: allowed.has(q.type) ? q.type : "explain",
    difficulty: Math.min(6, Math.max(1, Number(q.difficulty || 2))),
    questionMd: String(q.questionMd || q.question || "").trim(),
    answerMd: String(q.answerMd || q.answer || "").trim(),
    keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints.map(String) : [],
    hints: Array.isArray(q.hints) ? q.hints : [],
    commonMistakes: Array.isArray(q.commonMistakes) ? q.commonMistakes.map(String) : [],
    expectedMinutes: Math.max(1, Number(q.expectedMinutes || 2)),
    tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
    origin: "import",
    nextReviewAt: q.review?.nextReviewAt ? new Date(q.review.nextReviewAt) : q.nextReviewAt ? new Date(q.nextReviewAt) : new Date(),
    lastReviewedAt: q.review?.lastReviewedAt ? new Date(q.review.lastReviewedAt) : q.lastReviewedAt ? new Date(q.lastReviewedAt) : null,
    repetitions: Number(q.review?.repetitions ?? q.repetitions ?? 0),
    lapses: Number(q.review?.lapses ?? q.lapses ?? 0),
    intervalDays: Number(q.review?.intervalDays ?? q.intervalDays ?? 0),
    lastGrade: q.review?.lastGrade ?? q.lastGrade ?? null,
    confidence: q.review?.confidence ?? q.confidence ?? null,
    createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
    updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date(),
  })).filter((q: any) => q.questionMd && q.answerMd);

  if (!docs.length) return NextResponse.json({ error: "No valid questions found" }, { status: 400 });
  const inserted = await db.insert(questions).values(docs).onConflictDoNothing({ target: questions.externalId }).returning({ id: questions.id });
  return NextResponse.json({ inserted: inserted.length, skipped: docs.length - inserted.length }, { status: 201 });
}
