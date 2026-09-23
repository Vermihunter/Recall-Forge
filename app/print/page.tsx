export const dynamic = "force-dynamic";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, roadmapSessions, topics } from "@/db/schema";
import PrintStudio from "@/components/PrintStudio";

export default async function PrintPage() {
  const [rows, sessionRows] = await Promise.all([
    db.select().from(questions).orderBy(asc(questions.topicSlug), asc(questions.sessionSlug), asc(questions.difficulty), asc(questions.createdAt)),
    db
      .select({
        slug: roadmapSessions.slug,
        title: roadmapSessions.title,
        topicSlug: topics.slug,
        order: roadmapSessions.order,
      })
      .from(roadmapSessions)
      .innerJoin(topics, eq(roadmapSessions.topicId, topics.id))
      .orderBy(asc(topics.order), asc(roadmapSessions.order)),
  ]);

  return (
    <>
      <section className="hero print-page-hero">
        <div className="eyebrow">Duplex printable recall cards</div>
        <h1>Print exactly the questions you mean to print.</h1>
        <p className="lede">
          Scope a print job by topic and concrete roadmap session, keep a persistent printed/unprinted queue, then manually fine-tune the exact cards before sending them to paper or PDF.
        </p>
      </section>
      <PrintStudio questions={rows as any} sessions={sessionRows} />
    </>
  );
}
