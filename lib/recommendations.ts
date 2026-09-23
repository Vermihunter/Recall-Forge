export type RecommendationQuestion = {
  id: string;
  externalId?: string | null;
  topicSlug: string;
  sessionSlug?: string | null;
  format?: string | null;
  concepts?: string[];
  tags?: string[];
  subtopics?: string[];
  prerequisites?: string[];
  relatedQuestionIds?: string[];
  prerequisiteQuestionIds?: string[];
  correctOptionIndexes?: number[];
  optionFeedback?: { rationale:string; concepts:string[] }[];
  nextReviewAt?: Date | string | null;
  repetitions?: number | null;
};

export type AttemptSignal = {
  questionId: string;
  scorePermille: number;
  selfSignal?: string | null;
  selectedOptionIndexes?: number[];
  createdAt?: Date | string;
};

function clean(xs?: string[] | null) {
  return (xs || []).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
}

export function conceptKeys(q: RecommendationQuestion) {
  return Array.from(new Set([
    ...clean(q.concepts),
    ...clean(q.tags),
    ...clean(q.subtopics),
    ...clean(q.prerequisites),
    ...clean(q.prerequisites).map((x) => `prereq:${x}`),
  ]));
}

function addWeight(map: Map<string, number>, keys: string[], weight: number) {
  for (const key of clean(keys)) map.set(key, (map.get(key) || 0) + weight);
}

export function rankRecommendations(candidates: RecommendationQuestion[], seenQuestions: RecommendationQuestion[], attempts: AttemptSignal[], limit = 12) {
  const questionById = new Map(seenQuestions.map((q) => [q.id, q]));
  const weakConcepts = new Map<string, number>();
  const strongConcepts = new Map<string, number>();
  const weakExternalIds = new Map<string, number>();
  const weakQuestionIds = new Map<string, number>();
  const remedialQuestionIds = new Map<string, number>();
  const relatedQuestionIds = new Map<string, number>();
  const now = Date.now();

  for (const attempt of attempts) {
    const source = questionById.get(attempt.questionId);
    if (!source) continue;
    const ageMs = Math.max(0, now - new Date(attempt.createdAt || now).getTime());
    const recency = Math.max(0.35, Math.exp(-ageMs / (1000 * 60 * 60 * 24 * 45)));
    const score = Math.max(0, Math.min(1, Number(attempt.scorePermille || 0) / 1000));
    const selfPenalty = attempt.selfSignal === "missed" ? 1 : attempt.selfSignal === "partial" ? 0.7 : attempt.selfSignal === "knew" ? 0.15 : 1 - score;
    const weakness = Math.max(0, 1 - score, selfPenalty) * recency;
    const strength = Math.max(0, score - 0.55) * recency;

    // Question-level evidence: open self-assessment or aggregate multi-select score.
    if (weakness > 0.05) addWeight(weakConcepts, conceptKeys(source), weakness);
    if (strength > 0.05) addWeight(strongConcepts, conceptKeys(source), strength * 0.45);
    if (source.externalId && weakness > 0.05) weakExternalIds.set(source.externalId, Math.max(weakExternalIds.get(source.externalId) || 0, weakness));
    if (weakness > 0.05) weakQuestionIds.set(source.id, Math.max(weakQuestionIds.get(source.id) || 0, weakness));
    if (weakness > 0.05) {
      for (const id of source.prerequisiteQuestionIds || []) remedialQuestionIds.set(id, Math.max(remedialQuestionIds.get(id) || 0, weakness));
      for (const id of source.relatedQuestionIds || []) relatedQuestionIds.set(id, Math.max(relatedQuestionIds.get(id) || 0, weakness));
    }

    // Choice-level evidence is more diagnostic than the aggregate score. Every wrong
    // selected option OR missed correct option contributes weakness to that option's concepts.
    if (source.format === "multi_select" && source.optionFeedback?.length) {
      const selected = new Set(attempt.selectedOptionIndexes || []);
      const correct = new Set(source.correctOptionIndexes || []);
      source.optionFeedback.forEach((meta, index) => {
        const classifiedCorrectly = selected.has(index) === correct.has(index);
        if (classifiedCorrectly) addWeight(strongConcepts, meta.concepts || [], recency * 0.18);
        else addWeight(weakConcepts, meta.concepts || [], recency * 1.35);
      });
    }
  }

  const scored = candidates.map((q) => {
    let score = 0;
    const reasons: string[] = [];
    const keys = conceptKeys(q);
    const directWeakness = weakQuestionIds.get(q.id) || 0;
    if (directWeakness) { score += 2.8 * directWeakness; reasons.push("direct weak evidence"); }
    const overlaps = keys.map((key) => [key, Math.max(0, (weakConcepts.get(key) || 0) - (strongConcepts.get(key) || 0) * 0.55)] as const)
      .filter(([, weight]) => weight > 0)
      .sort((a, b) => b[1] - a[1]);
    if (overlaps.length) {
      score += overlaps.slice(0, 4).reduce((sum, [, weight]) => sum + weight * 2.4, 0);
      reasons.push(`weak-neighbor concepts: ${overlaps.slice(0, 3).map(([key]) => key.replace(/^prereq:/, "")).join(", ")}`);
    }
    if (q.externalId) {
      const remedial = remedialQuestionIds.get(q.externalId) || 0;
      const sibling = relatedQuestionIds.get(q.externalId) || 0;
      if (remedial) { score += 4.0 * remedial; reasons.push("prerequisite of a weak question"); }
      if (sibling) { score += 2.2 * sibling; reasons.push("explicit neighbor of a weak question"); }
    }
    for (const id of q.prerequisiteQuestionIds || []) {
      const w = weakExternalIds.get(id) || 0;
      if (w) { score += 1.15 * w; reasons.push("downstream check that depends on weak knowledge"); }
    }
    for (const id of q.relatedQuestionIds || []) {
      const w = weakExternalIds.get(id) || 0;
      if (w) { score += 1.5 * w; reasons.push("explicitly related to a weak question"); }
    }
    if (!q.repetitions) { score += 0.55; reasons.push("not yet well sampled"); }
    if (q.nextReviewAt && new Date(q.nextReviewAt).getTime() <= now) { score += 0.65; reasons.push("already due"); }
    return { question: q, score, reasons: Array.from(new Set(reasons)).slice(0, 3) };
  });

  return scored.filter((x) => x.score > 0.25).sort((a, b) => b.score - a.score).slice(0, limit);
}
