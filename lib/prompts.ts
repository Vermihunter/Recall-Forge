import { buildDepthGuide, deepObjective } from "@/lib/sessionDepth";
import { revisionQuestionSchema } from "@/lib/questionGeneration";

export type PromptMode = "session" | "teacher" | "socratic" | "interviewer" | "critic" | "question_generator";

export type SessionContext = {
  topicSlug?: string;
  topicTitle?: string;
  track?: string;
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
  depthGuide?: string[];
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
  const scope = (ctx.scope || []).map((x) => `- ${x}`).join("\n");
  const outcomes = (ctx.outcomes || []).map((x) => `- ${x}`).join("\n");
  const depthGuide = ctx.depthGuide?.length
    ? ctx.depthGuide
    : buildDepthGuide({ title: ctx.sessionTitle, objective: ctx.objective, scope: ctx.scope, outcomes: ctx.outcomes, track: ctx.track });
  const depth = depthGuide.map((x) => `- ${x}`).join("\n");
  const objective = deepObjective({ title: ctx.sessionTitle, objective: ctx.objective, scope: ctx.scope, outcomes: ctx.outcomes, track: ctx.track });

  return `RECALL FORGE SESSION\nTopic: ${ctx.topicTitle || ctx.topicSlug || "unspecified"}\nSession: ${ctx.sessionTitle || ctx.sessionSlug || "unspecified"}${ctx.sessionIndex && ctx.sessionCount ? ` (${ctx.sessionIndex}/${ctx.sessionCount})` : ""}\nObjective: ${objective}\nEstimated study time: ${ctx.estimatedMinutes || 45} minutes\n\nIN SCOPE\n${scope || "- Stay within the named session."}\n\nDEEP UNDERSTANDING CHECKPOINTS\n${depth}\n\nSESSION EXIT CRITERIA\n${outcomes || "- Explain and apply the session concepts cold."}\n${ctx.previousSessionTitle ? `\nPrevious session: ${ctx.previousSessionTitle}` : ""}${ctx.nextSessionTitle ? `\nNext session: ${ctx.nextSessionTitle}` : ""}\n\nBOUNDARY RULE — DEPTH, NOT BREADTH\nTeach and test ONLY this session. Going deeper means exposing the mechanism, state transitions, invariants, concrete traces, failure modes and tradeoffs INSIDE the current scope. It does NOT mean pulling adjacent roadmap topics into this chat. If a prerequisite gap appears, patch only the minimum required background and return immediately. If a detail deserves its own later session, name that boundary and defer it.`;
}

const jsonSchema = `Return final revision questions as ONLY valid JSON when explicitly requested. Mix open retrieval and diagnostic multi-select questions. For multi_select there are exactly four options and ZERO TO FOUR may be correct; never reveal the count in the wording. Include stable concept keys and sparse question-to-question graph links so later recommendations can propagate weakness to nearby/prerequisite questions.\nSchema:\n${revisionQuestionSchema}`;

export function buildPrompt(mode: PromptMode, values: Record<string, string>, ctx: SessionContext = {}) {
  const header = sessionHeader(ctx);
  const goal = values.goal || "Microsoft software-engineering interview preparation";
  const currentLevel = values.currentLevel || "I know the basics but want interview-grade recall.";
  const targetLevel = values.targetLevel || "I can explain it cold, compare alternatives, apply it, debug it and survive follow-up questions.";

  if (mode === "session") return `${header}\n\nYou are my Session Coach for ${goal}.\nCurrent level: ${currentLevel}\nTarget level: ${targetLevel}\n\nRun this as ONE continuous study chat with explicit phases. Do not dump everything at once. Depth must come from mechanism-level understanding inside the existing scope, never from silently enlarging the session.\n\nPHASE 1 — ORIENT\nGive me the mental model, the problem this mechanism solves, and the central invariant/constraint. Keep it compact. Then STOP and ask 3–5 retrieval questions. Do not answer them until I attempt them.\n\nPHASE 2 — TEACH IN SMALL, DEEP MICRO-SECTIONS\nSplit the in-scope material into only 3–5 micro-sections. Each micro-section should be small enough to study in roughly 8–12 minutes, but deep enough that I understand WHY and HOW it works rather than memorizing definitions. For each micro-section:\n- establish the problem/invariant first\n- explain the internal mechanism and relevant state/data structures\n- trace one concrete example precisely\n- include one edge case or failure symptom\n- mention the most relevant tradeoff only if it belongs inside this scope\nThen STOP for 3–5 retrieval questions. Diagnose my answer before continuing. Do not compensate for depth by widening the scope.\n\nPHASE 3 — RECONSTRUCT\nAsk me to explain the whole session from memory without notes, including the mechanism and one concrete trace. Do not help until I finish.\n\nPHASE 4 — CRITIQUE\nCritique my reconstruction. Separate: factual errors, missing causal links, missing mechanism/state, vague terminology, wrong causal reasoning, unsupported assumptions, and interview-risky wording. Make me repair the explanation myself.\n\nPHASE 5 — APPLY AND DEBUG FROM EVIDENCE\nGive realistic application/debugging/comparison questions inside this session. Make me predict behavior before revealing it. When debugging, provide concrete evidence such as logs, packet/header state, process/thread state, query plans, counters, traces or configuration snippets as appropriate to the domain. Increase difficulty and use follow-ups when my answer is definition-level or hand-wavy.\n\nPHASE 6 — ADVERSARIAL RETRIEVAL\nAsk 5–10 hard mixed questions that combine concepts from this session without introducing future-session material. Include at least one “what changes if…” question and one failure-diagnosis question.\n\nPHASE 7 — CLOSE\nSummarize only my remaining weak points and give a short readiness checklist against BOTH the original exit criteria and the deep-understanding checkpoints. Then ask whether I want the revision-question JSON. If I say yes, generate it using the schema below, scoped to topic '${ctx.topicSlug || "general"}' and session '${ctx.sessionSlug || "general"}'.\n\n${jsonSchema}\n\nStart with PHASE 1 only.`;

  if (mode === "teacher") return `${header}\n\nTeach me this session for ${goal}.\nCurrent level: ${currentLevel}\nTarget level: ${targetLevel}\n\nRules:\n1. Start with the problem, mental model and central invariant.\n2. Divide only this session into 3–5 small micro-sections.\n3. Teach one micro-section at a time.\n4. Explain mechanism/state, then trace one concrete example.\n5. Include one misconception or failure symptom.\n6. STOP after each section and ask 3–5 retrieval questions.\n7. Do not reveal answers until I attempt them.\n8. Identify gaps before continuing.\n9. Mark MUST KNOW / SHOULD KNOW / ADVANCED where useful.\n10. Do not drift into later roadmap sessions: depth is not breadth.\n\nStart with the first micro-section only.`;

  if (mode === "socratic") return `${header}\n\nAct as a Socratic tutor for ${goal}. Current level: ${currentLevel}\nAsk one question at a time. Prefer questions that force causal explanation, mechanism/state reconstruction, prediction, comparison, debugging from evidence and tradeoff reasoning. Do not lecture unless I am blocked after an attempt. When I answer, identify the precise gap and ask the smallest next question that repairs it. Stay inside this session.`;

  if (mode === "interviewer") return `${header}\n\nAct as a ${values.targetRole || "software engineering"} interviewer at ${values.level || "junior-to-mid"} level for approximately ${values.duration || "30 minutes"}. Stay inside this session. Ask one question at a time, use realistic follow-ups, challenge definition-only answers and hand-waving, and probe mechanism, state, tradeoffs and failure modes. Do not give answers until the interview ends. At the end, provide a concise gap report grouped by correctness, depth, communication and missed follow-ups.`;

  if (mode === "critic") return `${header}\n\nTarget level: ${targetLevel}\n\nCritique the explanation I reconstructed from memory below. Do not rewrite it immediately. First identify:\n- factual errors\n- missing causal links\n- missing internal mechanism/state transitions\n- vague or overloaded terminology\n- hidden assumptions\n- missing tradeoffs/failure modes\n- places where I cannot yet debug from observable evidence\n- likely interviewer follow-ups I could not yet survive\n- anything that belongs OUTSIDE this session and should be deferred\n\nThen ask me to repair the explanation myself.\n\nMY EXPLANATION:\n${values.studentAnswer || "(paste your reconstruction here)"}`;

  return `${header}\n\nGenerate ${values.questionCount || "30"} high-quality revision questions for ONLY this session and ${goal}.\nDistribution: 10% L1 recall, 20% L2 explanation, 20% L3 mechanism/trace, 20% L4 comparison/application, 20% L5 debugging/design, 10% L6 adversarial interview questions.\nAvoid duplicates and answer-giving wording. Prefer questions that require causal/mechanistic explanation over pure terminology. Hard questions must combine concepts or realistic constraints while remaining in scope. Include questions that test state transitions, concrete traces, failure diagnosis and tradeoffs when relevant.\nUse the supplied material when present, but correct obvious inaccuracies.\n\nSOURCE MATERIAL:\n${values.sourceMaterial || "Use the session definition and your expert knowledge."}\n\n${jsonSchema}`;
}
