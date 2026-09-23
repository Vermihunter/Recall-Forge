import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { topics } from "@/db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(topics).orderBy(asc(topics.order), asc(topics.title)));
}

export async function POST(req: Request) {
  const body = await req.json();
  const [topic] = await db.insert(topics).values({
    slug: String(body.slug || "").trim(),
    title: String(body.title || "").trim(),
    track: String(body.track || "Custom").trim(),
    parentTopicId: body.parentTopicId ? String(body.parentTopicId) : null,
    order: Number(body.order || 0),
    summary: String(body.summary || ""),
    stage: String(body.stage || "foundation"),
    mustKnow: Array.isArray(body.mustKnow) ? body.mustKnow.map(String) : [],
    progress: Number(body.progress || 0),
    isSeed: false,
    updatedAt: new Date(),
  }).returning();
  return NextResponse.json(topic, { status: 201 });
}
