import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { roadmapSessions, topics } from "@/db/schema";
import { defaultRoadmap } from "@/lib/defaultRoadmap";

export async function ensureSeedData() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(topics);
  if (Number(count) > 0) return;

  const createdTopics = await db.insert(topics).values(defaultRoadmap.map(topic => ({
    slug: topic.slug,
    title: topic.title,
    track: topic.track,
    order: topic.order,
    summary: topic.summary,
    stage: topic.stage,
    mustKnow: topic.mustKnow,
    isSeed: true,
  }))).onConflictDoNothing({ target: topics.slug }).returning();

  // A concurrent first request may have inserted the topics before this request.
  const allTopics = createdTopics.length === defaultRoadmap.length
    ? createdTopics
    : await db.select().from(topics);
  const ids = new Map(allTopics.map(topic => [topic.slug, topic.id]));

  const sessionRows = defaultRoadmap.flatMap(topic => {
    const topicId = ids.get(topic.slug);
    if (!topicId) return [];
    return topic.sessions.map((session, index) => ({
      topicId,
      slug: session.slug,
      title: session.title,
      order: index + 1,
      objective: session.objective,
      scope: session.scope,
      outcomes: session.outcomes,
      estimatedMinutes: session.estimatedMinutes ?? 45,
      status: "todo",
      isSeed: true,
    }));
  });

  if (sessionRows.length) {
    await db.insert(roadmapSessions).values(sessionRows).onConflictDoNothing({ target: roadmapSessions.slug });
  }
}

export async function topicBySlug(slug: string) {
  await ensureSeedData();
  return db.select().from(topics).where(eq(topics.slug, slug)).limit(1).then(rows => rows[0]);
}
