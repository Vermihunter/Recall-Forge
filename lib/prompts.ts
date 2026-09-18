export type PromptMode = "session" | "teacher" | "socratic" | "interviewer" | "critic" | "question_generator";

export type SessionContext = {
  topicSlug?: string;
  topicTitle?: string;
  sessionSlug?: string;
  sessionTitle?: string;
  objective?: string;
  scope?: string[];
  outcomes?: string[];
  estimatedMinutes?: number;
  sessionIndex?: number;
  sessionCount?: number;
  previousSessionTitle?: string;
  nextSessionTitle?: string;
};

export const promptModes: { id: PromptMode; name: string; short: string; fields: string[] }[] = [
  { id: "session", name: "Session Coach", short: "One complete chat: teach → retrieve → critique → apply → generate revision questions.", fields: ["goal", "currentLevel", "targetLevel"] },
  { id: "teacher", name: "Teacher", short: "Explain only this bounded session, progressively.", fields: ["goal", "currentLevel", "targetLevel"] },
  { id: "socratic", name: "Socratic Tutor", short: "Probe understanding without giving answers too early.", fields: ["goal", "currentLevel"] },
  { id: "interviewer", name: "Interviewer", short: "Run realistic follow-ups strictly inside this session.", fields: ["targetRole", "level", "duration"] },
  { id: "critic", name: "Critic", short: "Attack a reconstruction from memory and expose gaps.", fields: ["studentAnswer", "targetLevel"] },
  { id: "question_generator", name: "Question Generator", short: "Create importable L1–L6 revision questions scoped to this session.", fields: ["questionCount", "sourceMaterial"] },
];

function sessionHeader(ctx: SessionContext) {
  const scope = (ctx.scope || []).map(x => `- ${x}`).join("\n");
  const outcomes = (ctx.outcomes || []).map(x => `- ${x}`).join("\n");
  return `RECALL FORGE SESSION\nTopic: ${ctx.topicTitle || ctx.topicSlug || "unspecified"}\nSession: ${ctx.sessionTitle || ctx.sessionSlug || "unspecified"}${ctx.sessionIndex && ctx.sessionCount ? ` (${ctx.sessionIndex}/${ctx.sessionCount})` : ""}\nObjective: ${ctx.objective || "Master this bounded session."}\nEstimated study time: ${ctx.estimatedMinutes || 45} minutes\n\nIN SCOPE\n${scope || "- Stay within the named session."}\n\nSESSION EXIT CRITERIA\n${outcomes || "- Explain and apply the session concepts cold."}\n${ctx.previousSessionTitle ? `\nPrevious session: ${ctx.previousSessionTitle}` : ""}${ctx.nextSessionTitle ? `\nNext session: ${ctx.nextSessionTitle}` : ""}\n\nBOUNDARY RULE\nTeach and test ONLY this session. If a prerequisite gap appears, patch the minimum required background and return immediately. Do not pre-teach later sessions. Explicitly say when a question would belong to a later session.`;
}

const jsonSchema = `Return final revision questions as ONLY valid JSON when explicitly requested, matching:\n{\n  "questions": [\n    {\n      "id": "stable-readable-id",\n      "topic": "topic-slug",\n      "session": "session-slug",\n      "subtopics": ["..."],\n      "prerequisites": ["..."],\n      "type": "recall|explain|compare|application|debug|design|cross_topic|misconception",\n      "difficulty": 1,\n      "questionMd": "...",\n      "answerMd": "...",\n      "keyPoints": ["..."],\n      "hints": [{"level":1,"text":"..."}],\n      "commonMistakes": ["..."],\n      "expectedMinutes": 2,\n      "tags": ["..."]\n    }\n  ]\n}`;

export function buildPrompt(mode: PromptMode, values: Record<string,string>, ctx: SessionContext = {}) {
  const header = sessionHeader(ctx);
  const goal = values.goal || "Microsoft software-engineering interview preparation";
  const currentLevel = values.currentLevel || "I know the basics but want interview-grade recall.";
  const targetLevel = values.targetLevel || "I can explain it cold, compare alternatives, apply it, debug it and survive follow-up questions.";

  if (mode === "session") return `${header}\n\nYou are my Session Coach for ${goal}.\nCurrent level: ${currentLevel}\nTarget level: ${targetLevel}\n\nRun this as ONE continuous study chat with explicit phases. Do not dump everything at once.\n\nPHASE 1 — ORIENT\nGive me the mental model and why this session exists. Keep it compact. Then STOP and ask 3–5 retrieval questions. Do not answer them until I attempt them.\n\nPHASE 2 — TEACH IN MICRO-SECTIONS\nSplit the in-scope material into logical chunks. Teach one chunk at a time with one concrete engineering example and one important misconception. After EACH chunk, STOP for retrieval. Diagnose my answer before continuing.\n\nPHASE 3 — RECONSTRUCT\nAsk me to explain the whole session from memory without notes. Do not help until I finish.\n\nPHASE 4 — CRITIQUE\nCritique my reconstruction. Separate: factual errors, missing links, vague terminology, wrong causal reasoning, and interview-risky wording. Make me repair the explanation myself.\n\nPHASE 5 — APPLY\nGive realistic application/debugging/comparison questions inside this session. Increase difficulty. Use follow-ups when my answer is shallow.\n\nPHASE 6 — ADVERSARIAL RETRIEVAL\nAsk 5–10 hard mixed questions that combine concepts from this session without introducing future-session material.\n\nPHASE 7 — CLOSE\nSummarize only my remaining weak points and give a short readiness checklist against the exit criteria. Then ask whether I want the revision-question JSON. If I say yes, generate it using the schema below, scoped to topic '${ctx.topicSlug || "general"}' and session '${ctx.sessionSlug || "general"}'.\n\n${jsonSchema}\n\nStart with PHASE 1 only.`;

  if (mode === "teacher") return `${header}\n\nTeach me this session for ${goal}.\nCurrent level: ${currentLevel}\nTarget level: ${targetLevel}\n\nRules:\n1. Start with the mental model and why the concept exists.\n2. Divide only this session into manageable micro-sections.\n3. Teach one micro-section at a time.\n4. Give a concrete engineering example and misconception.\n5. STOP after each section and ask 3–5 retrieval questions.\n6. Do not reveal answers until I attempt them.\n7. Identify gaps before continuing.\n8. Mark MUST KNOW / SHOULD KNOW / ADVANCED where useful.\n9. Do not drift into later roadmap sessions.\n\nStart with the first micro-section only.`;

  if (mode === "socratic") return `${header}\n\nAct as a Socratic tutor for ${goal}. Current level: ${currentLevel}\nAsk one question at a time. Prefer questions that force causal explanation, prediction, comparison, debugging and tradeoff reasoning. Do not lecture unless I am blocked after an attempt. When I answer, identify the precise gap and ask the smallest next question that repairs it. Stay inside this session.`;

  if (mode === "interviewer") return `${header}\n\nAct as a ${values.targetRole || "software engineering"} interviewer at ${values.level || "junior-to-mid"} level for approximately ${values.duration || "30 minutes"}. Stay inside this session. Ask one question at a time, use realistic follow-ups, challenge hand-waving, and probe tradeoffs/failure modes. Do not give answers until the interview ends. At the end, provide a concise gap report grouped by correctness, depth, communication and missed follow-ups.`;

  if (mode === "critic") return `${header}\n\nTarget level: ${targetLevel}\n\nCritique the explanation I reconstructed from memory below. Do not rewrite it immediately. First identify:\n- factual errors\n- missing causal links\n- vague or overloaded terminology\n- hidden assumptions\n- missing tradeoffs/failure modes\n- likely interviewer follow-ups I could not yet survive\n- anything that belongs OUTSIDE this session and should be deferred\n\nThen ask me to repair the explanation myself.\n\nMY EXPLANATION:\n${values.studentAnswer || "(paste your reconstruction here)"}`;

  return `${header}\n\nGenerate ${values.questionCount || "30"} high-quality revision questions for ONLY this session and ${goal}.\nDistribution: 15% L1 recall, 20% L2 explanation, 20% L3 comparison/application, 20% L4 multi-concept reasoning, 15% L5 debugging/design, 10% L6 adversarial interview questions.\nAvoid duplicates and answer-giving wording. Hard questions must combine concepts or realistic constraints while remaining in scope.\nUse the supplied material when present, but correct obvious inaccuracies.\n\nSOURCE MATERIAL:\n${values.sourceMaterial || "Use the session definition and your expert knowledge."}\n\n${jsonSchema}`;
}
