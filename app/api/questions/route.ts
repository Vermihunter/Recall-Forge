import { and, asc, eq, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic");
  const session = url.searchParams.get("session");
  const type = url.searchParams.get("type");
  const difficulty = url.searchParams.get("difficulty");
  const due = url.searchParams.get("due");
  const limit = Math.min(Number(url.searchParams.get("limit") || 500), 1000);
  const conditions = [];
  if (topic) conditions.push(eq(questions.topicSlug, topic));
  if (session) conditions.push(eq(questions.sessionSlug, session));
  if (type) conditions.push(eq(questions.type, type));
  if (difficulty) conditions.push(eq(questions.difficulty, Number(difficulty)));
  if (due === "true") conditions.push(lte(questions.nextReviewAt, new Date()));
  const rows = await db.select().from(questions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(questions.nextReviewAt), asc(questions.difficulty))
    .limit(limit);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [question] = await db.insert(questions).values({
    externalId: body.externalId || null,
    topicSlug: String(body.topicSlug || body.topic || "general"),
    sessionSlug: body.sessionSlug || body.session || null,
    subtopics: Array.isArray(body.subtopics) ? body.subtopics : [],
    prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites : [],
    type: String(body.type || "explain"),
    difficulty: Math.max(1, Math.min(6, Number(body.difficulty || 2))),
    questionMd: String(body.questionMd || body.question || ""),
    answerMd: String(body.answerMd || body.answer || ""),
    keyPoints: Array.isArray(body.keyPoints) ? body.keyPoints : [],
    hints: Array.isArray(body.hints) ? body.hints : [],
    commonMistakes: Array.isArray(body.commonMistakes) ? body.commonMistakes : [],
    expectedMinutes: Math.max(1, Number(body.expectedMinutes || 2)),
    tags: Array.isArray(body.tags) ? body.tags : [],
    origin: "user",
    nextReviewAt: body.nextReviewAt ? new Date(body.nextReviewAt) : new Date(),
  }).returning();
  return NextResponse.json(question, { status: 201 });
}
