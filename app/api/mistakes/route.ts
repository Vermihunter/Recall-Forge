import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { mistakes } from "@/db/schema";

export async function GET() {
  return NextResponse.json(await db.select().from(mistakes).orderBy(desc(mistakes.createdAt)));
}

export async function POST(req: Request) {
  const body = await req.json();
  const [doc] = await db.insert(mistakes).values({
    title: String(body.title || ""), topicSlug: String(body.topicSlug || "general"), source: String(body.source || "study"),
    severity: String(body.severity || "medium"), context: String(body.context || ""), rootCause: String(body.rootCause || ""), repair: String(body.repair || ""), status: "open",
  }).returning();
  return NextResponse.json(doc, { status: 201 });
}
