import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questionAttempts, questions, revisionSessionItems, revisionSessions } from "@/db/schema";
import { computeNextReview, ReviewGrade } from "@/lib/review";

function normalizedIndexes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 4))).sort((a, b) => a - b);
}

function multipleChoiceScore(selected: number[], correct: number[]) {
  const selectedSet = new Set(selected), correctSet = new Set(correct);
  let correctDecisions = 0;
  for (let i = 0; i < 4; i++) if (selectedSet.has(i) === correctSet.has(i)) correctDecisions++;
  return Math.round((correctDecisions / 4) * 1000);
}

export async function POST(req: Request) {
  const body = await req.json();
  const questionId = String(body.questionId || "");
  const revisionSessionId = body.revisionSessionId ? String(body.revisionSessionId) : null;
  const current = (await db.select().from(questions).where(eq(questions.id, questionId)).limit(1))[0];
  if (!current) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const format = current.format === "multi_select" ? "multi_select" : "open";
  const selectedOptionIndexes = normalizedIndexes(body.selectedOptionIndexes);
  let selfSignal: string | null = body.selfSignal ? String(body.selfSignal) : null;
  let scorePermille = 0;
  let grade: ReviewGrade = "again";

  if (format === "multi_select") {
    scorePermille = multipleChoiceScore(selectedOptionIndexes, normalizedIndexes(current.correctOptionIndexes));
    grade = scorePermille === 1000 ? "good" : scorePermille >= 750 ? "hard" : "again";
    selfSignal = scorePermille === 1000 ? "correct" : scorePermille >= 750 ? "partial" : "missed";
  } else {
    if (!["missed", "partial", "knew"].includes(selfSignal || "")) return NextResponse.json({ error: "Open questions need missed, partial or knew feedback." }, { status: 400 });
    scorePermille = selfSignal === "knew" ? 1000 : selfSignal === "partial" ? 500 : 0;
    grade = selfSignal === "knew" ? "good" : selfSignal === "partial" ? "hard" : "again";
  }

  await db.insert(questionAttempts).values({
    revisionSessionId,
    questionId,
    format,
    selfSignal,
    selectedOptionIndexes,
    scorePermille,
    responseMs: Math.max(0, Math.min(60 * 60 * 1000, Number(body.responseMs || 0))),
    hintCount: Math.max(0, Number(body.hintCount || 0)),
  });

  const next = computeNextReview(current, grade);
  const [updated] = await db.update(questions).set({ ...next, confidence: Math.round(scorePermille / 10), updatedAt: new Date() }).where(eq(questions.id, questionId)).returning();

  if (revisionSessionId) {
    await db.update(revisionSessionItems).set({ status: "done" })
      .where(and(eq(revisionSessionItems.revisionSessionId, revisionSessionId), eq(revisionSessionItems.questionId, questionId)));
    await db.update(revisionSessions).set({ lastUsedAt: new Date(), updatedAt: new Date() }).where(eq(revisionSessions.id, revisionSessionId));
  }

  return NextResponse.json({ question: updated, scorePermille, grade, selectedOptionIndexes, correctOptionIndexes: current.correctOptionIndexes, optionFeedback: current.optionFeedback });
}
