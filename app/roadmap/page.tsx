export const dynamic = "force-dynamic";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { roadmapSessions, topics } from "@/db/schema";
import { ensureSeedData } from "@/lib/seed";
import RoadmapManager from "@/components/RoadmapManager";

export default async function RoadmapPage(){
  await ensureSeedData();
  const [topicRows,sessionRows]=await Promise.all([
    db.select().from(topics).orderBy(asc(topics.order)),
    db.select().from(roadmapSessions).orderBy(asc(roadmapSessions.order)),
  ]);
  return <>
    <section className="hero"><div className="eyebrow">Roadmap → concrete sessions</div><h1>One chat should teach one bounded thing.</h1><p className="lede">Topics organize the syllabus. Sessions are the actual unit of work: each has a narrow scope, exit criteria, estimated time and a one-chat learning flow with teaching, retrieval, critique and application.</p></section>
    <RoadmapManager initialTopics={topicRows as any} initialSessions={sessionRows as any}/>
  </>;
}
