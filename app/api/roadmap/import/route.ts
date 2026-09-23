import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { roadmapSessions, topics } from "@/db/schema";

const cleanStrings = (value: unknown) => Array.isArray(value) ? value.map(String).map((x) => x.trim()).filter(Boolean) : [];
const cleanStage = (value: unknown) => ["foundation", "core", "advanced"].includes(String(value)) ? String(value) : "foundation";

type FlatTopic = {
  input: any;
  slug: string;
  parentSlug: string | null;
  parentSpecified: boolean;
};

function flattenTopics(items: any[], inheritedParent?: string | null): FlatTopic[] {
  const out: FlatTopic[] = [];
  for (const input of items) {
    const slug = String(input?.slug || "").trim();
    const hasExplicitParent = Object.prototype.hasOwnProperty.call(input || {}, "parentSlug");
    const parentSlug = hasExplicitParent
      ? (input?.parentSlug ? String(input.parentSlug).trim() : null)
      : (inheritedParent === undefined ? null : inheritedParent);
    out.push({ input, slug, parentSlug, parentSpecified: hasExplicitParent || inheritedParent !== undefined });
    if (Array.isArray(input?.children) && input.children.length) out.push(...flattenTopics(input.children, slug));
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const rawTopics = Array.isArray(raw) ? raw : raw?.topics;
    if (!Array.isArray(rawTopics)) {
      return NextResponse.json({ error: "Expected a roadmap JSON object with a topics array." }, { status: 400 });
    }

    const inputTopics = flattenTopics(rawTopics);
    const topicSlugs = new Set<string>();
    const sessionSlugs = new Set<string>();
    for (const row of inputTopics) {
      const { input, slug: topicSlug } = row;
      if (!topicSlug || !String(input?.title || "").trim()) {
        return NextResponse.json({ error: "Every topic needs a non-empty slug and title." }, { status: 400 });
      }
      if (topicSlugs.has(topicSlug)) {
        return NextResponse.json({ error: `Duplicate topic slug in import: ${topicSlug}` }, { status: 400 });
      }
      topicSlugs.add(topicSlug);

      const sessions = Array.isArray(input?.sessions) ? input.sessions : [];
      for (const session of sessions) {
        const sessionSlug = String(session?.slug || "").trim();
        if (!sessionSlug || !String(session?.title || "").trim()) {
          return NextResponse.json({ error: `Every session in ${topicSlug} needs a non-empty slug and title.` }, { status: 400 });
        }
        if (sessionSlugs.has(sessionSlug)) {
          return NextResponse.json({ error: `Duplicate session slug in import: ${sessionSlug}` }, { status: 400 });
        }
        sessionSlugs.add(sessionSlug);
      }
    }

    for (const row of inputTopics) {
      if (row.parentSlug && !topicSlugs.has(row.parentSlug)) {
        const existingParent = (await db.select({ id: topics.id }).from(topics).where(eq(topics.slug, row.parentSlug)).limit(1))[0];
        if (!existingParent) return NextResponse.json({ error: `Unknown parentSlug '${row.parentSlug}' for topic '${row.slug}'.` }, { status: 400 });
      }
    }

    const importedParents = new Map(inputTopics.filter((row) => row.parentSpecified && row.parentSlug).map((row) => [row.slug, row.parentSlug as string]));
    for (const slug of importedParents.keys()) {
      const seen = new Set<string>([slug]);
      let cursor = importedParents.get(slug);
      while (cursor && importedParents.has(cursor)) {
        if (seen.has(cursor)) return NextResponse.json({ error: `Topic hierarchy cycle detected around '${slug}'.` }, { status: 400 });
        seen.add(cursor);
        cursor = importedParents.get(cursor);
      }
    }

    let createdTopics = 0;
    let updatedTopics = 0;
    let createdSessions = 0;
    let updatedSessions = 0;
    const idsBySlug = new Map<string, string>();

    // Pass 1: create/update curriculum content without touching existing learner state or hierarchy.
    for (const row of inputTopics) {
      const input = row.input;
      const slug = row.slug;
      const existingTopic = (await db.select().from(topics).where(eq(topics.slug, slug)).limit(1))[0];
      const topicValues = {
        slug,
        title: String(input.title || "").trim(),
        track: String(input.track || "Custom").trim(),
        order: Number(input.order || 0),
        summary: String(input.summary || ""),
        stage: cleanStage(input.stage),
        mustKnow: cleanStrings(input.mustKnow),
        updatedAt: new Date(),
      };

      if (existingTopic) {
        const [updated] = await db.update(topics).set(topicValues).where(eq(topics.id, existingTopic.id)).returning();
        idsBySlug.set(slug, updated.id);
        updatedTopics++;
      } else {
        const [created] = await db.insert(topics).values({ ...topicValues, progress: 0, isSeed: false }).returning();
        idsBySlug.set(slug, created.id);
        createdTopics++;
      }
    }

    // Pull IDs for parents that may already exist outside this import.
    for (const row of inputTopics) {
      if (!row.parentSlug || idsBySlug.has(row.parentSlug)) continue;
      const existing = (await db.select({ id: topics.id }).from(topics).where(eq(topics.slug, row.parentSlug)).limit(1))[0];
      if (existing) idsBySlug.set(row.parentSlug, existing.id);
    }

    // Pass 2: hierarchy is opt-in. Old flat curriculum imports therefore cannot accidentally destroy
    // manually-created parent/sub-topic relationships. Explicit parentSlug:null deliberately makes a root.
    for (const row of inputTopics) {
      if (!row.parentSpecified) continue;
      const topicId = idsBySlug.get(row.slug)!;
      const parentTopicId = row.parentSlug ? idsBySlug.get(row.parentSlug) || null : null;
      if (parentTopicId === topicId) return NextResponse.json({ error: `Topic '${row.slug}' cannot be its own parent.` }, { status: 400 });
      await db.update(topics).set({ parentTopicId, updatedAt: new Date() }).where(eq(topics.id, topicId));
    }

    // Pass 3: sessions remain attached to their stable topic/session slugs. Learner state is preserved.
    for (const row of inputTopics) {
      const input = row.input;
      const topicId = idsBySlug.get(row.slug)!;
      const inputSessions = Array.isArray(input.sessions) ? input.sessions : [];
      for (const inputSession of inputSessions) {
        const sessionSlug = String(inputSession.slug).trim();
        const existingSession = (await db.select().from(roadmapSessions).where(eq(roadmapSessions.slug, sessionSlug)).limit(1))[0];
        const sessionValues = {
          topicId,
          slug: sessionSlug,
          title: String(inputSession.title || "").trim(),
          order: Number(inputSession.order || 0),
          objective: String(inputSession.objective || ""),
          scope: cleanStrings(inputSession.scope),
          outcomes: cleanStrings(inputSession.outcomes),
          estimatedMinutes: Math.max(5, Number(inputSession.estimatedMinutes || 45)),
          updatedAt: new Date(),
        };

        if (existingSession) {
          // Curriculum refresh is intentionally content-only. Keep status, planning, notes and stable IDs.
          // Questions are not touched, therefore review progress and all print history also survive.
          await db.update(roadmapSessions).set(sessionValues).where(eq(roadmapSessions.id, existingSession.id));
          updatedSessions++;
        } else {
          await db.insert(roadmapSessions).values({
            ...sessionValues,
            status: "todo",
            notes: String(inputSession.notes || ""),
            isSeed: false,
          });
          createdSessions++;
        }
      }
    }

    const [allTopics, allSessions] = await Promise.all([
      db.select().from(topics).orderBy(asc(topics.order), asc(topics.title)),
      db.select().from(roadmapSessions).orderBy(asc(roadmapSessions.order), asc(roadmapSessions.title)),
    ]);

    return NextResponse.json({
      ok: true,
      createdTopics,
      updatedTopics,
      createdSessions,
      updatedSessions,
      topics: allTopics,
      sessions: allSessions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import roadmap JSON.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
