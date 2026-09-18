import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiSessions } from "@/db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(aiSessions).orderBy(desc(aiSessions.createdAt)).limit(100));
}

export async function POST(req: Request) {
  const body = await req.json();
  const [doc] = await db.insert(aiSessions).values({
    mode: String(body.mode || "session"), topic: String(body.topic || ""), roadmapSessionSlug: body.roadmapSessionSlug || null,
    prompt: String(body.prompt || ""), response: String(body.response || ""), notes: String(body.notes || ""), score: body.score == null ? null : Number(body.score),
  }).returning();
  return NextResponse.json(doc, { status: 201 });
}
