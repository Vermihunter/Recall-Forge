import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { computeNextReview, ReviewGrade } from "@/lib/review";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { grade, confidence } = await req.json() as { grade: ReviewGrade; confidence?: number };
  if (!["again", "hard", "good", "easy"].includes(grade)) return NextResponse.json({ error: "Invalid grade" }, { status: 400 });
  const current = (await db.select().from(questions).where(eq(questions.id, id)).limit(1))[0];
  if (!current) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  const next = computeNextReview(current, grade);
  const [updated] = await db.update(questions).set({ ...next, confidence: confidence ?? current.confidence, updatedAt: new Date() }).where(eq(questions.id, id)).returning();
  return NextResponse.json(updated);
}
