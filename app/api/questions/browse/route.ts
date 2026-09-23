import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionSlugs = (url.searchParams.get("sessions") || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!sessionSlugs.length) return NextResponse.json({ items: [], total: 0, limit: 40, offset: 0 });

  const q = (url.searchParams.get("q") || "").trim();
  const format = (url.searchParams.get("format") || "").trim();
  const type = (url.searchParams.get("type") || "").trim();
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 40)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const conditions: any[] = [inArray(questions.sessionSlug, sessionSlugs)];
  if (format) conditions.push(eq(questions.format, format));
  if (type) conditions.push(eq(questions.type, type));
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(or(
      ilike(questions.questionMd, pattern),
      ilike(questions.answerMd, pattern),
      sql`${questions.tags}::text ILIKE ${pattern}`,
      sql`${questions.concepts}::text ILIKE ${pattern}`,
      sql`${questions.subtopics}::text ILIKE ${pattern}`,
    ));
  }
  const where = and(...conditions);
  const [rows, countRows] = await Promise.all([
    db.select().from(questions).where(where).orderBy(asc(questions.sessionSlug), asc(questions.difficulty), asc(questions.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(questions).where(where),
  ]);
  return NextResponse.json({ items: rows, total: Number(countRows[0]?.count || 0), limit, offset });
}
