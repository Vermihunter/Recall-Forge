import { asc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions, roadmapSessions, topics } from "@/db/schema";

const key = (value: unknown) => String(value || "")
  .trim()
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

type SessionRow = {
  id: string;
  slug: string;
  title: string;
  order: number;
  status: string;
  objective: string;
  scope: string[];
  outcomes: string[];
  topicId: string;
  topicSlug: string;
  topicTitle: string;
  track: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rich = url.searchParams.get("view") === "v2";

  const [sessionRows, grouped] = await Promise.all([
    db.select({
      id: roadmapSessions.id,
      slug: roadmapSessions.slug,
      title: roadmapSessions.title,
      order: roadmapSessions.order,
      status: roadmapSessions.status,
      objective: roadmapSessions.objective,
      scope: roadmapSessions.scope,
      outcomes: roadmapSessions.outcomes,
      topicId: topics.id,
      topicSlug: topics.slug,
      topicTitle: topics.title,
      track: topics.track,
    }).from(roadmapSessions)
      .innerJoin(topics, sql`${roadmapSessions.topicId} = ${topics.id}`)
      .orderBy(asc(topics.track), asc(topics.order), asc(roadmapSessions.order)),
    db.select({
      sessionSlug: questions.sessionSlug,
      topicSlug: questions.topicSlug,
      count: sql<number>`count(*)::int`,
      unprintedCount: sql<number>`count(*) filter (where ${questions.lastPrintedAt} is null)::int`,
    }).from(questions)
      .groupBy(questions.sessionSlug, questions.topicSlug),
  ]);

  const rows = sessionRows as SessionRow[];
  const topicAliases = new Map<string, { id:string; slug:string; title:string; track:string }[]>();
  const sessionAliases = new Map<string, SessionRow[]>();
  const sessionsByTopic = new Map<string, SessionRow[]>();

  for (const row of rows) {
    const topic = { id: row.topicId, slug: row.topicSlug, title: row.topicTitle, track: row.track };
    for (const alias of [row.topicId, row.topicSlug, row.topicTitle]) {
      const k = key(alias);
      if (!k) continue;
      const list = topicAliases.get(k) || [];
      if (!list.some((x) => x.id === topic.id)) list.push(topic);
      topicAliases.set(k, list);
    }
    for (const alias of [row.id, row.slug, row.title]) {
      const k = key(alias);
      if (!k) continue;
      const list = sessionAliases.get(k) || [];
      if (!list.some((x) => x.id === row.id)) list.push(row);
      sessionAliases.set(k, list);
    }
    const list = sessionsByTopic.get(row.topicId) || [];
    list.push(row);
    sessionsByTopic.set(row.topicId, list);
  }

  const counts = new Map<string, { total:number; unprinted:number }>();
  const unassigned = new Map<string, { total:number; unprinted:number; topic?: { id:string; slug:string; title:string; track:string } }>();

  function add(map: Map<string, { total:number; unprinted:number }>, id: string, total: number, unprintedCount: number) {
    const prev = map.get(id) || { total: 0, unprinted: 0 };
    prev.total += total;
    prev.unprinted += unprintedCount;
    map.set(id, prev);
  }

  for (const group of grouped) {
    const total = Number(group.count || 0);
    const unprintedCount = Number(group.unprintedCount || 0);
    const topicCandidates = topicAliases.get(key(group.topicSlug)) || [];
    const topic = topicCandidates.length === 1 ? topicCandidates[0] : undefined;
    const candidateSessions = sessionAliases.get(key(group.sessionSlug)) || [];
    let session: SessionRow | undefined;

    if (candidateSessions.length === 1) session = candidateSessions[0];
    else if (topic && candidateSessions.length > 1) session = candidateSessions.find((x) => x.topicId === topic.id);
    else if (topic && group.sessionSlug) {
      const local = sessionsByTopic.get(topic.id) || [];
      session = local.find((x) => key(x.slug) === key(group.sessionSlug) || key(x.title) === key(group.sessionSlug));
    }

    if (session) {
      add(counts, session.id, total, unprintedCount);
      continue;
    }

    const bucketKey = topic ? topic.slug : "__unknown__";
    const prev = unassigned.get(bucketKey) || { total: 0, unprinted: 0, topic };
    prev.total += total;
    prev.unprinted += unprintedCount;
    unassigned.set(bucketKey, prev);
  }

  const sources = rows.map((row) => {
    const count = counts.get(row.id) || { total: 0, unprinted: 0 };
    return {
      ...row,
      sourceKey: row.slug,
      questionCount: count.total,
      unprintedCount: count.unprinted,
      isVirtual: false,
    };
  });

  const virtualSources = Array.from(unassigned.entries())
    .filter(([, value]) => value.total > 0)
    .map(([topicSlug, value]) => ({
      id: `unassigned:${topicSlug}`,
      slug: `__unassigned__:${topicSlug}`,
      sourceKey: `__unassigned__:${topicSlug}`,
      title: "Needs assignment",
      order: 999999,
      status: "unassigned",
      objective: "Imported questions that could not be matched to a roadmap session.",
      scope: [] as string[],
      outcomes: [] as string[],
      topicId: value.topic?.id || "__unknown__",
      topicSlug: value.topic?.slug || "__unknown__",
      topicTitle: value.topic?.title || "Unknown topic",
      track: value.topic?.track || "Needs attention",
      questionCount: value.total,
      unprintedCount: value.unprinted,
      isVirtual: true,
    }));

  if (!rich) return NextResponse.json(sources);

  const totalQuestions = grouped.reduce((sum, x) => sum + Number(x.count || 0), 0);
  const unprintedQuestions = grouped.reduce((sum, x) => sum + Number(x.unprintedCount || 0), 0);
  const mappedQuestions = sources.reduce((sum, x) => sum + x.questionCount, 0);
  return NextResponse.json({
    sources: [...sources, ...virtualSources],
    stats: {
      totalQuestions,
      mappedQuestions,
      unassignedQuestions: Math.max(0, totalQuestions - mappedQuestions),
      unprintedQuestions,
    },
  });
}
