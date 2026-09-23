export const dynamic = "force-dynamic";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { roadmapSessions, topics } from "@/db/schema";
import RoadmapManager from "@/components/RoadmapManager";

export default async function RoadmapPage(){
  const [topicRows,sessionRows]=await Promise.all([
    db.select().from(topics).orderBy(asc(topics.order)),
    db.select().from(roadmapSessions).orderBy(asc(roadmapSessions.order)),
  ]);
  return <>
    <section className="hero"><div className="eyebrow">Roadmap → hierarchy → concrete sessions</div><h1>Broad topics organize. Leaf topics go deep.</h1><p className="lede">Build parent topics such as TCP, place focused sub-topics underneath, and keep sessions at the leaf level as the actual one-chat unit of work. Collapse whole tracks, plan sessions, or generate an A4 cheatsheet prompt from any topic branch.</p></section>
    <RoadmapManager initialTopics={topicRows as any} initialSessions={sessionRows as any}/>
  </>;
}
