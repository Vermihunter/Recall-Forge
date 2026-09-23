export type QuestionSourceSession = {
  slug: string;
  title: string;
  objective?: string;
  scope?: string[];
  outcomes?: string[];
  topicSlug: string;
  topicTitle: string;
  track: string;
};

export const revisionQuestionSchema = `{
  "questions": [
    {
      "id": "stable-readable-id",
      "topic": "topic-slug",
      "session": "source-session-slug",
      "subtopics": ["..."],
      "prerequisites": ["concept prerequisite keys"],
      "concepts": ["2-5 stable concept keys"],
      "relatedQuestionIds": ["other-question-id"],
      "prerequisiteQuestionIds": ["question-id-that-should-be-known-first"],
      "type": "recall|explain|compare|application|debug|design|cross_topic|misconception",
      "format": "open|multi_select",
      "difficulty": 1,
      "questionMd": "...",
      "answerMd": "...",
      "options": ["A", "B", "C", "D"],
      "correctOptionIndexes": [0, 2],
      "optionFeedback": [
        {"rationale":"why option A is correct/incorrect","concepts":["concept-key"]},
        {"rationale":"...","concepts":["..."]},
        {"rationale":"...","concepts":["..."]},
        {"rationale":"...","concepts":["..."]}
      ],
      "keyPoints": ["..."],
      "hints": [{"level":1,"text":"..."}],
      "commonMistakes": ["..."],
      "expectedMinutes": 2,
      "tags": ["..."]
    }
  ]
}`;

export function buildMultiSessionQuestionPrompt(sessions: QuestionSourceSession[], questionCount = 40) {
  const source = sessions.map((s, i) => `${i + 1}. ${s.track} → ${s.topicTitle} → ${s.title}\n   session: ${s.slug}\n   objective: ${s.objective || ""}\n   scope: ${(s.scope || []).join("; ")}\n   exit criteria: ${(s.outcomes || []).join("; ")}`).join("\n\n");
  return `RECALL FORGE — MULTI-SESSION REVISION QUESTION GENERATOR

Generate ${questionCount} high-quality revision questions/tasks across ONLY the roadmap sessions below.

SOURCE SESSIONS
${source}

PURPOSE
These questions feed a feedback-driven revision engine. They must test deep understanding, not recognition. The engine uses concept/question relationships to recommend nearby questions when a learner is weak, so graph metadata must be meaningful and consistent.

FORMAT MIX
- Roughly 55–70% format=\"open\": question/answer retrieval requiring explanation, trace, application or debugging.
- Roughly 30–45% format=\"multi_select\": exactly FOUR answer options. Anywhere from ZERO to FOUR options may be correct. Never imply how many are correct. A learner may submit no options.
- Multi-select questions should test reasoning and misconceptions, not trivia.
- For multi_select: options MUST contain exactly 4 strings; correctOptionIndexes contains every correct zero-based index and may be []. optionFeedback MUST contain exactly 4 entries explaining each option and naming the concept(s) that option diagnoses.
- For open questions: options=[], correctOptionIndexes=[], optionFeedback=[].

KNOWLEDGE GRAPH METADATA
- concepts: 2–5 short, reusable canonical concept keys. Reuse the SAME key across questions about the same concept.
- prerequisiteQuestionIds: IDs of generated questions whose knowledge is genuinely prerequisite. Keep this sparse and mostly acyclic.
- relatedQuestionIds: nearby questions testing the same mechanism from a different angle. Keep 0–4 useful links.
- prerequisites: concept-level prerequisites, not prose paragraphs.
- Make some questions deliberately adjacent to each other: if one fails, the neighboring questions should reveal whether the weakness is a prerequisite gap, a misconception, or inability to apply the mechanism.

DEPTH
Include a deliberate spread from direct recall through mechanism/state reconstruction, traces, prediction, debugging from evidence, comparison and adversarial interview-style follow-ups. Prefer causal/mechanistic questions. Stay within the supplied sessions.

OUTPUT
Return ONLY valid JSON. No Markdown fence, no commentary.
Schema:
${revisionQuestionSchema}`;
}
