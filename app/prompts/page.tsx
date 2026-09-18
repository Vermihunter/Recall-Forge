export const dynamic = "force-dynamic";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { roadmapSessions, topics } from "@/db/schema";
import { ensureSeedData } from "@/lib/seed";
import PromptStudio from "@/components/PromptStudio";

export default async function PromptsPage({searchParams}:{searchParams:Promise<{topic?:string;session?:string}>}){
  await ensureSeedData(); const {topic="",session=""}=await searchParams; let ctx:any={topicSlug:topic};
  if(session){
    const rows=await db.select({s:roadmapSessions,t:topics}).from(roadmapSessions).innerJoin(topics,eq(roadmapSessions.topicId,topics.id)).where(eq(roadmapSessions.slug,session)).limit(1);
    if(rows[0]){const all=await db.select().from(roadmapSessions).where(eq(roadmapSessions.topicId,rows[0].t.id)).orderBy(asc(roadmapSessions.order));const index=all.findIndex(x=>x.id===rows[0].s.id);ctx={topicSlug:rows[0].t.slug,topicTitle:rows[0].t.title,sessionSlug:rows[0].s.slug,sessionTitle:rows[0].s.title,objective:rows[0].s.objective,scope:rows[0].s.scope,outcomes:rows[0].s.outcomes,estimatedMinutes:rows[0].s.estimatedMinutes,sessionIndex:index+1,sessionCount:all.length,previousSessionTitle:index>0?all[index-1].title:undefined,nextSessionTitle:index>=0&&index<all.length-1?all[index+1].title:undefined};}
  }
  return <><section className="hero"><div className="eyebrow">One predefined session / one ChatGPT conversation</div><h1>Go deep without losing the boundary.</h1><p className="lede">Session Coach is the default: mental model → micro-teaching → retrieval → reconstruction → critique → application → adversarial revision. The roadmap decides exactly what belongs in this chat and what waits for later.</p></section><PromptStudio initialTopic={ctx.topicSlug||topic} sessionContext={ctx}/></>;
}
