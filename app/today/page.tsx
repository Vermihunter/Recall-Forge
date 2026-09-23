export const dynamic = "force-dynamic";

import { asc } from "drizzle-orm";
import { db } from "@/db";
import { roadmapSessions, topics } from "@/db/schema";
import DailyPlanner from "@/components/DailyPlanner";

export default async function TodayPage() {
  const [topicRows, sessionRows] = await Promise.all([
    db.select().from(topics).orderBy(asc(topics.order), asc(topics.title)),
    db.select().from(roadmapSessions).orderBy(asc(roadmapSessions.order), asc(roadmapSessions.title)),
  ]);

  return <>
    <section className="hero today-page-hero">
      <div className="eyebrow">Daily execution</div>
      <h1>Build today from concrete sessions.</h1>
      <p className="lede">The roadmap is the syllabus; this page is the commitment. Pick a realistic amount of work, put it in order, and start each session from here.</p>
    </section>
    <DailyPlanner initialTopics={topicRows as any} initialSessions={sessionRows as any} />
  </>;
}
