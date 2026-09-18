import { ne } from "drizzle-orm";
import { db } from "@/db";
import { questions } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(questions).where(ne(questions.origin, "seed"));
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), questions: rows }, null, 2);
  return new Response(payload, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="recall-forge-user-questions-${new Date().toISOString().slice(0,10)}.json"`,
    },
  });
}
