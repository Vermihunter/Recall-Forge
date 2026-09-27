import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { questions, roadmapSessions, topics } from "@/db/schema";

const allowed = new Set(["recall", "explain", "compare", "application", "debug", "design", "cross_topic", "misconception"]);
const key = (value: unknown) => String(value || "")
  .trim()
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

function normalizeOptionIndexes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 4))).sort((a, b) => a - b);
}

function normalizeOptionFeedback(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  return Array.from({ length: 4 }, (_, i) => {
    const x: any = rows[i] || {};
    return { rationale: String(x?.rationale || ""), concepts: Array.isArray(x?.concepts) ? x.concepts.map(String) : [] };
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const items = Array.isArray(body) ? body : body.questions;
  if (!Array.isArray(items)) return NextResponse.json({ error: "Expected an array or { questions: [...] }" }, { status: 400 });

  const sourceRows = await db.select({
    id: roadmapSessions.id,
    slug: roadmapSessions.slug,
    title: roadmapSessions.title,
    topicId: topics.id,
    topicSlug: topics.slug,
    topicTitle: topics.title,
  }).from(roadmapSessions).innerJoin(topics, eq(roadmapSessions.topicId, topics.id));

  const topicAliases = new Map<string, { id:string; slug:string; title:string }[]>();
  const sessionAliases = new Map<string, typeof sourceRows>();
  for (const row of sourceRows) {
    const topic = { id: row.topicId, slug: row.topicSlug, title: row.topicTitle };
    for (const alias of [row.topicId, row.topicSlug, row.topicTitle]) {
      const k = key(alias); const list = topicAliases.get(k) || [];
      if (!list.some((x) => x.id === topic.id)) list.push(topic); topicAliases.set(k, list);
    }
    for (const alias of [row.id, row.slug, row.title]) {
      const k = key(alias); const list = sessionAliases.get(k) || [];
      if (!list.some((x) => x.id === row.id)) list.push(row); sessionAliases.set(k, list);
    }
  }

  const root: any = Array.isArray(body) ? {} : body;
  const rootTopic = root.topicSlug || root.topic || root.source?.topicSlug || root.source?.topic || null;
  const rootSession = root.sessionSlug || root.session || root.source?.sessionSlug || root.source?.session || null;
  let matchedSessions = 0;
  let unmatchedSessions = 0;

  const docs = items.map((q: any, idx: number) => {
    const format = q.format === "multi_select" ? "multi_select" : "open";
    const rawTopic = q.topicSlug || q.topic || rootTopic || "general";
    const rawSession = q.sessionSlug || q.session || rootSession || null;
    const topicCandidates = topicAliases.get(key(rawTopic)) || [];
    const topic = topicCandidates.length === 1 ? topicCandidates[0] : undefined;
    const sessionCandidates = rawSession ? (sessionAliases.get(key(rawSession)) || []) : [];
    let session = sessionCandidates.length === 1 ? sessionCandidates[0] : undefined;
    if (!session && topic && sessionCandidates.length > 1) session = sessionCandidates.find((x) => x.topicId === topic.id);
    if (session) matchedSessions += 1;
    else if (rawSession) unmatchedSessions += 1;

    return {
      externalId: q.id || q.externalId || `import-${Date.now()}-${idx}`,
      topicSlug: session?.topicSlug || topic?.slug || String(rawTopic),
      sessionSlug: session?.slug || (rawSession ? String(rawSession) : null),
      subtopics: Array.isArray(q.subtopics) ? q.subtopics.map(String) : [],
      prerequisites: Array.isArray(q.prerequisites) ? q.prerequisites.map(String) : [],
      type: allowed.has(q.type) ? q.type : "explain",
      format,
      difficulty: Math.min(6, Math.max(1, Number(q.difficulty || 2))),
      questionMd: String(q.questionMd || q.question || "").trim(),
      answerMd: String(q.answerMd || q.answer || "").trim(),
      options: format === "multi_select" && Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
      correctOptionIndexes: format === "multi_select" ? normalizeOptionIndexes(q.correctOptionIndexes) : [],
      optionFeedback: format === "multi_select" ? normalizeOptionFeedback(q.optionFeedback) : [],
      concepts: Array.isArray(q.concepts) ? q.concepts.map(String) : [],
      relatedQuestionIds: Array.isArray(q.relatedQuestionIds) ? q.relatedQuestionIds.map(String) : [],
      prerequisiteQuestionIds: Array.isArray(q.prerequisiteQuestionIds) ? q.prerequisiteQuestionIds.map(String) : [],
      keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints.map(String) : [],
      hints: Array.isArray(q.hints) ? q.hints : [],
      commonMistakes: Array.isArray(q.commonMistakes) ? q.commonMistakes.map(String) : [],
      expectedMinutes: Math.max(1, Number(q.expectedMinutes || 2)),
      tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
      origin: "import",
      nextReviewAt: q.review?.nextReviewAt ? new Date(q.review.nextReviewAt) : q.nextReviewAt ? new Date(q.nextReviewAt) : new Date(),
      lastReviewedAt: q.review?.lastReviewedAt ? new Date(q.review.lastReviewedAt) : q.lastReviewedAt ? new Date(q.lastReviewedAt) : null,
      repetitions: Number(q.review?.repetitions ?? q.repetitions ?? 0),
      lapses: Number(q.review?.lapses ?? q.lapses ?? 0),
      intervalDays: Number(q.review?.intervalDays ?? q.intervalDays ?? 0),
      lastGrade: q.review?.lastGrade ?? q.lastGrade ?? null,
      confidence: q.review?.confidence ?? q.confidence ?? null,
      lastPrintedAt: q.lastPrintedAt ? new Date(q.lastPrintedAt) : null,
      printCount: Math.max(0, Number(q.printCount ?? 0)),
      createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
      updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date(),
    };
  }).filter((q: any) => q.questionMd && q.answerMd && (q.format !== "multi_select" || q.options.length === 4));

  if (!docs.length) return NextResponse.json({ error: "No valid questions found" }, { status: 400 });
  const inserted = await db.insert(questions).values(docs).onConflictDoNothing({ target: questions.externalId }).returning({ id: questions.id });
  return NextResponse.json({
    inserted: inserted.length,
    skipped: docs.length - inserted.length,
    matchedSessions,
    unmatchedSessions,
    message: unmatchedSessions
      ? `${unmatchedSessions} imported question(s) could not be matched to a roadmap session and are visible under Needs assignment.`
      : "All imported questions were matched to roadmap sessions.",
  }, { status: 201 });
}
