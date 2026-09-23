import { eq } from "drizzle-orm";
import { db } from "@/db";
import { topics } from "@/db/schema";

/**
 * Automatic seed insertion is intentionally disabled.
 * Recall Forge now treats roadmap JSON imports as the source of curriculum truth,
 * so clearing the database stays cleared until you explicitly import a roadmap.
 */
export async function ensureSeedData() {
  return;
}

export async function topicBySlug(slug: string) {
  return db.select().from(topics).where(eq(topics.slug, slug)).limit(1).then((rows) => rows[0]);
}
