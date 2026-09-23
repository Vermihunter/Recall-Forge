import { inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions } from "@/db/schema";

export async function POST(req: Request) {
  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
  const action = body.action === "unmark" ? "unmark" : "mark";

  if (!ids.length) return NextResponse.json({ error: "No question IDs supplied" }, { status: 400 });
  if (ids.length > 2000) return NextResponse.json({ error: "Too many questions in one update" }, { status: 400 });

  if (action === "unmark") {
    await db
      .update(questions)
      .set({ lastPrintedAt: null, printCount: 0, updatedAt: new Date() })
      .where(inArray(questions.id, ids));
  } else {
    await db
      .update(questions)
      .set({
        lastPrintedAt: new Date(),
        printCount: sql`${questions.printCount} + 1`,
        updatedAt: new Date(),
      })
      .where(inArray(questions.id, ids));
  }

  return NextResponse.json({ updated: ids.length, action });
}
