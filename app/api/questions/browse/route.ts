import { asc, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions, roadmapSessions, topics } from "@/db/schema";

const key = (value: unknown) =>
  String(value || "")
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
  topicId: string;
  topicSlug: string;
  topicTitle: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sourceKeys = (
    url.searchParams.get("sources") ||
    url.searchParams.get("sessions") ||
    ""
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const limit = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("limit") || 40)),
  );
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  if (!sourceKeys.length)
    return NextResponse.json({ items: [], total: 0, limit, offset: 0 });

  const sessionRows = await db
    .select({
      id: roadmapSessions.id,
      slug: roadmapSessions.slug,
      title: roadmapSessions.title,
      topicId: topics.id,
      topicSlug: topics.slug,
      topicTitle: topics.title,
    })
    .from(roadmapSessions)
    .innerJoin(topics, eq(roadmapSessions.topicId, topics.id));

  const rows: SessionRow[] = sessionRows;
  const selectedNormal = new Set(
    sourceKeys.filter((x) => !x.startsWith("__unassigned__:")),
  );
  const selectedUnassigned = new Set(
    sourceKeys
      .filter((x) => x.startsWith("__unassigned__:"))
      .map((x) => x.slice("__unassigned__:".length)),
  );

  const topicAliases = new Map<
    string,
    { id: string; slug: string; title: string }[]
  >();
  const sessionAliases = new Map<string, SessionRow[]>();
  const selectedRows = rows.filter((x) => selectedNormal.has(x.slug));
  for (const row of rows) {
    const topic = {
      id: row.topicId,
      slug: row.topicSlug,
      title: row.topicTitle,
    };
    for (const alias of [row.topicId, row.topicSlug, row.topicTitle]) {
      const k = key(alias);
      const list = topicAliases.get(k) || [];
      if (!list.some((x) => x.id === topic.id)) list.push(topic);
      topicAliases.set(k, list);
    }
    for (const alias of [row.id, row.slug, row.title]) {
      const k = key(alias);
      const list = sessionAliases.get(k) || [];
      if (!list.some((x) => x.id === row.id)) list.push(row);
      sessionAliases.set(k, list);
    }
  }

  const candidateTopicValues = Array.from(
    new Set(
      [
        ...selectedRows.flatMap((x) => [x.topicSlug, x.topicTitle]),
        ...Array.from(selectedUnassigned).flatMap((slug) => {
          const t = rows.find((x) => x.topicSlug === slug);
          return t
            ? [t.topicSlug, t.topicTitle]
            : slug === "__unknown__"
              ? []
              : [slug];
        }),
      ].filter(Boolean),
    ),
  );
  const candidateSessionValues = Array.from(
    new Set(
      selectedRows.flatMap((x) => [x.slug, x.title, x.id]).filter(Boolean),
    ),
  );

  let candidates: any[] = [];
  // A virtual "Needs assignment" source is produced after tolerant/normalized matching in
  // /api/questions/sources. Its raw imported topic/session values may be a UUID, title,
  // differently-cased slug, or another alias that cannot safely be reconstructed into one
  // exact SQL IN clause here. When such a source is selected we therefore classify on the
  // server from the question rows and still return only the requested page to the browser.
  // This fixes the misleading state where the navigator says e.g. "31 Q" but the exact view
  // says "0 matching questions".
  if (selectedUnassigned.size > 0) {
    candidates = await db
      .select()
      .from(questions)
      .orderBy(asc(questions.createdAt));
  } else if (candidateTopicValues.length && candidateSessionValues.length) {
    candidates = await db
      .select()
      .from(questions)
      .where(
        or(
          inArray(questions.topicSlug, candidateTopicValues),
          inArray(questions.sessionSlug, candidateSessionValues),
        ),
      )
      .orderBy(asc(questions.createdAt));
  } else if (candidateTopicValues.length) {
    candidates = await db
      .select()
      .from(questions)
      .where(inArray(questions.topicSlug, candidateTopicValues))
      .orderBy(asc(questions.createdAt));
  } else if (candidateSessionValues.length) {
    candidates = await db
      .select()
      .from(questions)
      .where(inArray(questions.sessionSlug, candidateSessionValues))
      .orderBy(asc(questions.createdAt));
  } else {
    candidates = [];
  }

  function sourceKeyFor(q: any) {
    const topicCandidates = topicAliases.get(key(q.topicSlug)) || [];
    const topic = topicCandidates.length === 1 ? topicCandidates[0] : undefined;
    const sessionCandidates = sessionAliases.get(key(q.sessionSlug)) || [];
    let session: SessionRow | undefined;
    if (sessionCandidates.length === 1) session = sessionCandidates[0];
    else if (topic && sessionCandidates.length > 1)
      session = sessionCandidates.find((x) => x.topicId === topic.id);
    if (session) return session.slug;
    return `__unassigned__:${topic?.slug || "__unknown__"}`;
  }

  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const format = (url.searchParams.get("format") || "").trim();
  const type = (url.searchParams.get("type") || "").trim();
  const difficulty = Number(url.searchParams.get("difficulty") || 0);
  const printState = (url.searchParams.get("print") || "").trim();

  const filtered = candidates.filter((item: any) => {
    if (!sourceKeys.includes(sourceKeyFor(item))) return false;
    if (format && item.format !== format) return false;
    if (type && item.type !== type) return false;
    if (difficulty && Number(item.difficulty) !== difficulty) return false;
    if (printState === "unprinted" && item.lastPrintedAt) return false;
    if (printState === "printed" && !item.lastPrintedAt) return false;
    if (q) {
      const haystack = [
        item.questionMd,
        item.answerMd,
        ...(item.tags || []),
        ...(item.concepts || []),
        ...(item.subtopics || []),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a: any, b: any) => {
    const sa = sourceKeyFor(a),
      sb = sourceKeyFor(b);
    if (sa !== sb) return sa.localeCompare(sb);
    return (
      Number(a.difficulty || 0) - Number(b.difficulty || 0) ||
      String(a.questionMd).localeCompare(String(b.questionMd))
    );
  });

  if (url.searchParams.get("idsOnly") === "true") {
    return NextResponse.json({
      ids: filtered.map((x: any) => x.id),
      total: filtered.length,
    });
  }

  return NextResponse.json({
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  });
}
