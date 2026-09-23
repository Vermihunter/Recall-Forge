"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import { buildDepthGuide, deepObjective } from "@/lib/sessionDepth";

export type RoadmapTopic = {
  id: string;
  slug: string;
  title: string;
  track: string;
  parentTopicId?: string | null;
  order: number;
  summary: string;
  stage: string;
  mustKnow: string[];
  progress: number;
  isSeed: boolean;
};

export type RoadmapSession = {
  id: string;
  topicId: string;
  slug: string;
  title: string;
  order: number;
  objective: string;
  scope: string[];
  outcomes: string[];
  estimatedMinutes: number;
  status: string;
  plannedFor?: string | null;
  planOrder: number;
  notes: string;
  isSeed: boolean;
};

type TopicDraft = Omit<RoadmapTopic, "id" | "progress" | "isSeed"> & { mustKnowText: string };
type SessionDraft = Omit<RoadmapSession, "id" | "isSeed" | "plannedFor" | "planOrder"> & { scopeText: string; outcomesText: string };

const blankTopic = (parentTopicId: string | null = null, track = "Custom"): TopicDraft => ({
  slug: "",
  title: "",
  track,
  parentTopicId,
  order: 9999,
  summary: "",
  stage: "foundation",
  mustKnow: [],
  mustKnowText: "",
});
const blankSession = (topicId = ""): SessionDraft => ({ topicId, slug: "", title: "", order: 1, objective: "", scope: [], scopeText: "", outcomes: [], outcomesText: "", estimatedMinutes: 45, status: "todo", notes: "" });
const splitLines = (value: string) => value.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function clip(value: string, max = 260) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1)}…`;
}

export default function RoadmapManager({ initialTopics, initialSessions }: { initialTopics: RoadmapTopic[]; initialSessions: RoadmapSession[] }) {
  const [topics, setTopics] = useState(initialTopics);
  const [sessions, setSessions] = useState(initialSessions);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsedTracks, setCollapsedTracks] = useState<Record<string, boolean>>({});
  const [topicEditor, setTopicEditor] = useState<{ id?: string; draft: TopicDraft } | null>(null);
  const [sessionEditor, setSessionEditor] = useState<{ id?: string; draft: SessionDraft } | null>(null);
  const [busy, setBusy] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [cheatsheetSelection, setCheatsheetSelection] = useState<Set<string>>(new Set());
  const [cheatsheetSearch, setCheatsheetSearch] = useState("");
  const [cheatsheetCopied, setCheatsheetCopied] = useState(false);
  const today = todayKey();

  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const sessionsByTopic = useMemo(() => sessions.reduce((acc: Record<string, RoadmapSession[]>, s) => { (acc[s.topicId] ??= []).push(s); return acc; }, {}), [sessions]);
  const childrenByTopic = useMemo(() => {
    const out: Record<string, RoadmapTopic[]> = {};
    for (const t of topics) if (t.parentTopicId) (out[t.parentTopicId] ??= []).push(t);
    for (const rows of Object.values(out)) rows.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    return out;
  }, [topics]);
  const grouped = useMemo(() => topics.slice().sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)).reduce((acc: Record<string, RoadmapTopic[]>, t) => { (acc[t.track] ??= []).push(t); return acc; }, {}), [topics]);

  function getChildren(topicId: string) {
    return childrenByTopic[topicId] || [];
  }

  function descendantIds(topicId: string) {
    const result = new Set<string>();
    const visit = (id: string) => {
      for (const child of getChildren(id)) {
        if (result.has(child.id)) continue;
        result.add(child.id);
        visit(child.id);
      }
    };
    visit(topicId);
    return result;
  }

  function branchTopicIds(topicId: string) {
    return new Set([topicId, ...descendantIds(topicId)]);
  }

  function branchSessions(topicId: string) {
    const ids = branchTopicIds(topicId);
    return sessions.filter((s) => ids.has(s.topicId));
  }

  function rootTopicsForTrack(track: string) {
    const rows = grouped[track] || [];
    return rows.filter((t) => {
      if (!t.parentTopicId) return true;
      const parent = topicById.get(t.parentTopicId);
      return !parent || parent.track !== track;
    });
  }

  function topicDepth(topicId: string) {
    let depth = 0;
    let cursor = topicById.get(topicId);
    const seen = new Set<string>();
    while (cursor?.parentTopicId && !seen.has(cursor.parentTopicId)) {
      seen.add(cursor.parentTopicId);
      const parent = topicById.get(cursor.parentTopicId);
      if (!parent) break;
      depth++;
      cursor = parent;
    }
    return depth;
  }

  function editTopic(t?: RoadmapTopic, parent?: RoadmapTopic) {
    if (t) {
      setTopicEditor({ id: t.id, draft: { ...t, parentTopicId: t.parentTopicId || null, mustKnowText: (t.mustKnow || []).join(", ") } });
      return;
    }
    setTopicEditor({ draft: blankTopic(parent?.id || null, parent?.track || "Custom") });
  }

  function editSession(topicId: string, s?: RoadmapSession) {
    const nextOrder = (sessionsByTopic[topicId]?.length || 0) + 1;
    setSessionEditor({ id: s?.id, draft: s ? { topicId: s.topicId, slug: s.slug, title: s.title, order: s.order, objective: s.objective, scope: s.scope, scopeText: (s.scope || []).join("\n"), outcomes: s.outcomes, outcomesText: (s.outcomes || []).join("\n"), estimatedMinutes: s.estimatedMinutes, status: s.status, notes: s.notes } : { ...blankSession(topicId), order: nextOrder } });
  }

  async function patchSession(id: string, patch: Partial<RoadmapSession>) {
    const r = await fetch(`/api/roadmap-sessions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const updated = await r.json();
    if (!r.ok) throw new Error(updated.error || "Could not update session");
    setSessions((rows) => rows.map((x) => x.id === updated.id ? updated : x));
    return updated as RoadmapSession;
  }

  async function saveTopic(e: FormEvent) {
    e.preventDefault();
    if (!topicEditor) return;
    setBusy(true);
    const d = topicEditor.draft;
    const parent = d.parentTopicId ? topicById.get(d.parentTopicId) : null;
    const body = { ...d, track: parent?.track || d.track, parentTopicId: d.parentTopicId || null, mustKnow: splitLines(d.mustKnowText) };
    const r = await fetch(topicEditor.id ? `/api/topics/${topicEditor.id}` : "/api/topics", { method: topicEditor.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const saved = await r.json();
    setBusy(false);
    if (!r.ok) return alert(saved.error || "Could not save topic");
    setTopics((v) => topicEditor.id ? v.map((x) => x.id === saved.id ? saved : x) : [...v, saved]);
    if (saved.parentTopicId) setExpanded((x) => ({ ...x, [saved.parentTopicId]: true }));
    setTopicEditor(null);
  }

  async function saveSession(e: FormEvent) {
    e.preventDefault();
    if (!sessionEditor) return;
    setBusy(true);
    const d = sessionEditor.draft;
    const body = { ...d, scope: splitLines(d.scopeText), outcomes: splitLines(d.outcomesText) };
    const r = await fetch(sessionEditor.id ? `/api/roadmap-sessions/${sessionEditor.id}` : "/api/roadmap-sessions", { method: sessionEditor.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const saved = await r.json();
    setBusy(false);
    if (!r.ok) return alert(saved.error || "Could not save session");
    setSessions((v) => sessionEditor.id ? v.map((x) => x.id === saved.id ? saved : x) : [...v, saved]);
    setSessionEditor(null);
    setExpanded((x) => ({ ...x, [saved.topicId]: true }));
  }

  async function cycleStatus(s: RoadmapSession) {
    const next = s.status === "todo" ? "active" : s.status === "active" ? "done" : "todo";
    try { await patchSession(s.id, { status: next }); } catch (error) { alert(error instanceof Error ? error.message : "Could not update status"); }
  }

  async function toggleToday(s: RoadmapSession) {
    try {
      if (s.plannedFor === today) {
        await patchSession(s.id, { plannedFor: null, planOrder: 0 });
        return;
      }
      const todaySessions = sessions.filter((x) => x.plannedFor === today);
      const nextOrder = todaySessions.length ? Math.max(...todaySessions.map((x) => x.planOrder || 0)) + 10 : 10;
      await patchSession(s.id, { plannedFor: today, planOrder: nextOrder });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not update today's plan");
    }
  }

  async function removeTopic(t: RoadmapTopic) {
    const childCount = getChildren(t.id).length;
    const warning = childCount ? ` It also has ${childCount} direct sub-topic${childCount === 1 ? "" : "s"}; deleting it will detach them to top level.` : "";
    if (!confirm(`Delete “${t.title}” and all of its directly-owned roadmap sessions? Questions are not deleted.${warning}`)) return;
    const r = await fetch(`/api/topics/${t.id}`, { method: "DELETE" });
    if (r.ok) {
      setTopics((v) => v.filter((x) => x.id !== t.id).map((x) => x.parentTopicId === t.id ? { ...x, parentTopicId: null } : x));
      setSessions((v) => v.filter((x) => x.topicId !== t.id));
    }
  }

  async function removeSession(s: RoadmapSession) {
    if (!confirm(`Delete session “${s.title}”?`)) return;
    const r = await fetch(`/api/roadmap-sessions/${s.id}`, { method: "DELETE" });
    if (r.ok) setSessions((v) => v.filter((x) => x.id !== s.id));
  }

  async function importRoadmap(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportMessage("");
    try {
      const data = JSON.parse(await file.text());
      const importedTopics = Array.isArray(data) ? data : data?.topics;
      if (!Array.isArray(importedTopics)) throw new Error("This file does not contain a topics array.");
      const countTree = (rows: any[]): [number, number] => rows.reduce(([tc, sc], t: any) => {
        const sessionsHere = Array.isArray(t?.sessions) ? t.sessions.length : 0;
        const [childTopics, childSessions] = Array.isArray(t?.children) ? countTree(t.children) : [0, 0];
        return [tc + 1 + childTopics, sc + sessionsHere + childSessions];
      }, [0, 0] as [number, number]);
      const [topicCount, sessionCount] = countTree(importedTopics);
      if (!confirm(`Import ${topicCount} topics and ${sessionCount} sessions? Existing matching slugs will be updated; completed/active state, daily planning, personal notes, questions and print history will be preserved. Hierarchy changes happen only when parentSlug or nested children are explicitly present.`)) return;
      setBusy(true);
      const r = await fetch("/api/roadmap/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || "Could not import roadmap.");
      setTopics(result.topics);
      setSessions(result.sessions);
      setImportMessage(`Imported: ${result.createdTopics} new + ${result.updatedTopics} updated topics; ${result.createdSessions} new + ${result.updatedSessions} updated sessions.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Could not import roadmap JSON.");
    } finally {
      setBusy(false);
    }
  }

  function setTrackExpansion(track: string, open: boolean) {
    const ids = (grouped[track] || []).map((t) => t.id);
    setExpanded((current) => {
      const next = { ...current };
      for (const id of ids) next[id] = open;
      return next;
    });
  }

  function openCheatsheet(seedIds: string[] = []) {
    setCheatsheetSelection(new Set(seedIds));
    setCheatsheetSearch("");
    setCheatsheetCopied(false);
    setCheatsheetOpen(true);
  }

  function toggleCheatsheetTopic(id: string) {
    setCheatsheetSelection((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setCheatsheetCopied(false);
  }

  const cheatsheetPrompt = useMemo(() => {
    if (!cheatsheetSelection.size) return "Select one or more roadmap topics to build the prompt.";

    const selectedIds = Array.from(cheatsheetSelection);
    const selectedSet = new Set(selectedIds);
    const hasSelectedAncestor = (topic: RoadmapTopic) => {
      let cursor = topic.parentTopicId ? topicById.get(topic.parentTopicId) : undefined;
      const seen = new Set<string>();
      while (cursor && !seen.has(cursor.id)) {
        if (selectedSet.has(cursor.id)) return true;
        seen.add(cursor.id);
        cursor = cursor.parentTopicId ? topicById.get(cursor.parentTopicId) : undefined;
      }
      return false;
    };
    const roots = selectedIds.map((id) => topicById.get(id)).filter((t): t is RoadmapTopic => !!t && !hasSelectedAncestor(t));

    const renderTopic = (topic: RoadmapTopic, depth = 0): string => {
      const indent = "  ".repeat(depth);
      const ss = (sessionsByTopic[topic.id] || []).slice().sort((a, b) => a.order - b.order);
      const lines = [
        `${indent}${depth === 0 ? "TOPIC" : "SUB-TOPIC"}: ${topic.title} [${topic.slug}]`,
        `${indent}Summary: ${clip(topic.summary || "No summary supplied.", 360)}`,
        `${indent}Must remember: ${(topic.mustKnow || []).join("; ") || "Use the sessions below to infer the essential memory anchors."}`,
      ];
      if (ss.length) {
        lines.push(`${indent}Sessions:`);
        for (const s of ss) {
          lines.push(`${indent}- ${s.title}: ${clip(s.objective, 280)}`);
          if (s.scope?.length) lines.push(`${indent}  In scope: ${s.scope.join("; ")}`);
          if (s.outcomes?.length) lines.push(`${indent}  Exit criteria: ${s.outcomes.join("; ")}`);
        }
      }
      for (const child of getChildren(topic.id)) lines.push(renderTopic(child, depth + 1));
      return lines.join("\n");
    };

    const source = roots.map((t) => renderTopic(t)).join("\n\n==============================\n\n");
    return `Create an exceptionally polished, dense-but-readable printable CHEATSHEET from the curriculum below.

OUTPUT CONTRACT
- Return ONLY one complete standalone HTML document. No Markdown fence and no commentary outside the HTML.
- It must print perfectly on A4 portrait paper using browser Print / Save as PDF.
- Use @page { size: A4 portrait; margin: 7mm; } and print-color-adjust: exact / -webkit-print-color-adjust: exact.
- No external assets, fonts, scripts, CDNs or network requests. Everything must be inline HTML/CSS/SVG.
- Create exactly ONE A4 page for each top-level selected topic/cluster below. Descendant sub-topics belong on their parent's page.
- Never overflow a page. Prefer concise wording, compact tables, diagrams, arrows and tiny callouts over long prose.

VISUAL DESIGN
- Make it genuinely beautiful and colorful: strong section colors, tinted panels, compact badges, mini diagrams, flow arrows, header strips and memorable visual grouping.
- Use a clean 2- or 3-column editorial grid. Body text should normally be ~8.2–9.2pt, headings larger, with excellent hierarchy.
- Give each major concept a small visual block. Use color consistently by concept family, not randomly.
- Include a compact title/header with the topic name and a 1-sentence mental model.
- Use HTML/CSS/SVG diagrams where useful (state machines, packet/header layout, timelines, layers, flows). Keep them schematic and tiny.

CONTENT RULES
- This is a memory sheet, NOT a tutorial. Minimal description, maximum useful recall density.
- Cover every important mechanism explicitly present in the curriculum, while staying inside the selected topic boundaries.
- You may add standard expert-level facts that are essential to understand the selected topic even when not literally written below, but do not drift into neighboring roadmap topics.
- Prioritize: mental model; terminology; invariants; internal state/data structures; lifecycle/state transitions; protocol/header or API structure; algorithms; timers/defaults/formulas when useful; performance behavior; common failure modes; debugging evidence; security/reliability implications; and the distinctions interviewers commonly probe.
- Add conspicuous “REMEMBER” / “DON'T CONFUSE” callouts for facts worth memorizing.
- Prefer tiny tables like “Concept | What it does | What to remember” over paragraphs.
- For protocol-oriented material such as TCP, explicitly include compact structures (for example the TCP header), lifecycle/state diagrams, congestion-control phases such as slow start/congestion avoidance, retransmission/ACK behavior, flow-control vs congestion-control, and debugging signals IF they are in scope.
- For OS/database/runtime topics, use equivalent mechanism-level diagrams and state summaries.
- Avoid motivational filler, history unless directly useful, and verbose definitions.

CURRICULUM SOURCE OF TRUTH
${source}

Before finalizing, internally verify that every session/scope item above has at least one visible memory anchor on the relevant A4 page, and that the page would still be readable when physically printed.`;
  }, [cheatsheetSelection, topicById, sessionsByTopic, childrenByTopic]);

  async function copyCheatsheetPrompt() {
    try {
      await navigator.clipboard.writeText(cheatsheetPrompt);
      setCheatsheetCopied(true);
      setTimeout(() => setCheatsheetCopied(false), 1800);
    } catch {
      alert("Could not access the clipboard. Select the prompt text and copy it manually.");
    }
  }

  const cheatsheetVisibleTopics = useMemo(() => {
    const q = cheatsheetSearch.trim().toLowerCase();
    return topics.slice().sort((a, b) => a.track.localeCompare(b.track) || a.order - b.order || a.title.localeCompare(b.title)).filter((t) => !q || `${t.track} ${t.title} ${t.slug} ${t.summary} ${(t.mustKnow || []).join(" ")}`.toLowerCase().includes(q));
  }, [topics, cheatsheetSearch]);

  const editorDescendants = topicEditor?.id ? descendantIds(topicEditor.id) : new Set<string>();
  const parentOptions = topicEditor ? topics.filter((t) => t.id !== topicEditor.id && !editorDescendants.has(t.id) && (!topicEditor.draft.track || t.track === topicEditor.draft.track)).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)) : [];

  function renderTopicRow(t: RoadmapTopic, path: number[], depth: number): ReactNode {
    const directSessions = (sessionsByTopic[t.id] || []).slice().sort((a, b) => a.order - b.order);
    const children = getChildren(t.id);
    const allBranchSessions = branchSessions(t.id);
    const done = allBranchSessions.filter((x) => x.status === "done").length;
    const plannedToday = allBranchSessions.filter((x) => x.plannedFor === today).length;
    const isOpen = expanded[t.id] ?? false;
    const percent = allBranchSessions.length ? Math.round(done / allBranchSessions.length * 100) : 0;
    const number = path.map((x) => String(x).padStart(2, "0")).join(".");
    const hasMixedSessions = children.length > 0 && directSessions.length > 0;

    return <div className="topic-tree-node" key={t.id}>
      <article className={`topic-row-card ${isOpen ? "open" : "collapsed"} ${depth > 0 ? "subtopic" : ""}`} style={{ marginLeft: `${Math.min(depth, 4) * 22}px` }}>
        <div className="topic-row-summary">
          <button className="topic-collapse-button" onClick={() => setExpanded((x) => ({ ...x, [t.id]: !isOpen }))} aria-label={isOpen ? "Collapse topic" : "Expand topic"}>{isOpen ? "−" : "+"}</button>
          <div className="topic-row-number">{number}</div>
          <div className="topic-row-title"><span>{depth > 0 ? `sub-topic · ${t.stage}` : t.stage}</span><strong>{t.title}</strong>{!isOpen && <small>{t.summary}</small>}</div>
          <div className="topic-row-progress"><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><small>{done}/{allBranchSessions.length} done</small></div>
          {children.length > 0 && <span className="badge">{children.length} sub</span>}
          {plannedToday > 0 && <span className="badge accent">{plannedToday} today</span>}
          <div className="topic-row-controls">
            <button className="icon-btn cheatsheet-icon" title="Build cheatsheet from this topic" onClick={() => openCheatsheet([t.id])}>▤</button>
            <button className="icon-btn" title="Edit topic" onClick={() => editTopic(t)}>✎</button>
            <button className="icon-btn danger-text" title="Delete topic" onClick={() => removeTopic(t)}>×</button>
          </div>
        </div>

        {isOpen && <div className="topic-row-details">
          <div className="topic-detail-intro"><p>{t.summary}</p><div className="chips">{(t.mustKnow || []).map((x) => <span className="chip" key={x}>{x}</span>)}</div></div>
          <div className="topic-actions">
            <button className="btn small ghost" onClick={() => editTopic(undefined, t)}>+ Sub-topic</button>
            {children.length === 0 ? <button className="btn small ghost" onClick={() => editSession(t.id)}>+ Session</button> : <span className="leaf-topic-note">Sessions are created on leaf topics</span>}
            <Link className="btn small ghost" href={`/questions?topic=${encodeURIComponent(t.slug)}`}>Questions</Link>
            <button className="btn small secondary" onClick={() => openCheatsheet([t.id])}>Cheatsheet prompt</button>
          </div>
          {hasMixedSessions && <div className="hierarchy-warning">This topic has both sub-topics and old direct sessions. They remain visible so nothing is lost; for the clean hierarchy, move future sessions to leaf sub-topics.</div>}
          {directSessions.length > 0 && <div className="session-list">{directSessions.map((s, idx) => {
            const depthGuide = buildDepthGuide({ title: s.title, objective: s.objective, scope: s.scope, outcomes: s.outcomes, track: t.track });
            const deepGoal = deepObjective({ title: s.title, objective: s.objective, scope: s.scope, outcomes: s.outcomes, track: t.track });
            return <div className={`session-row status-${s.status} ${s.plannedFor === today ? "planned-today" : ""}`} key={s.id}>
              <button className="session-status" onClick={() => cycleStatus(s)} title="Cycle todo → active → done"><span>{s.status === "done" ? "✓" : s.status === "active" ? "▶" : "○"}</span></button>
              <div className="session-main"><div className="session-kicker">SESSION {idx + 1} · ~{s.estimatedMinutes} MIN · SMALL SCOPE / DEEP MODEL{s.plannedFor ? ` · ${s.plannedFor === today ? "TODAY" : `PLANNED ${s.plannedFor}`}` : ""}</div><strong>{s.title}</strong><p>{deepGoal}</p><div className="session-scope">{(s.scope || []).slice(0, 5).map((x) => <span key={x}>{x}</span>)}</div><details className="session-depth"><summary>Deep-understanding checkpoints</summary><ul>{depthGuide.map((x, i) => <li key={i}>{x}</li>)}</ul><div className="session-depth-boundary">Keep these inside the existing scope. Do not pull material from later sessions just to make this one “deeper”.</div></details></div>
              <div className="session-actions"><button className={`btn small ${s.plannedFor === today ? "secondary" : "ghost"}`} onClick={() => toggleToday(s)}>{s.plannedFor === today ? "Remove today" : "+ Today"}</button><Link className="btn small accent" href={`/prompts?topic=${encodeURIComponent(t.slug)}&session=${encodeURIComponent(s.slug)}`}>Start deep chat →</Link><button className="icon-btn" onClick={() => editSession(t.id, s)}>✎</button><button className="icon-btn danger-text" onClick={() => removeSession(s)}>×</button></div>
            </div>;
          })}</div>}
        </div>}
      </article>
      {isOpen && children.length > 0 && <div className="topic-children">{children.map((child, index) => renderTopicRow(child, [...path, index + 1], depth + 1))}</div>}
    </div>;
  }

  return <>
    <div className="roadmap-toolbar card-flat">
      <div>
        <strong>Roadmap editor</strong>
        <div className="muted">Use parent topics for broad areas such as TCP, leaf sub-topics for concrete units, and sessions as the actual one-chat study unit.</div>
        {importMessage && <div className="inline-status">{importMessage}</div>}
      </div>
      <div className="actions">
        <Link className="btn secondary" href="/today">Open today’s plan</Link>
        <button className="btn secondary" onClick={() => openCheatsheet()}>Cheatsheet builder</button>
        <label className={`btn secondary file-btn ${busy ? "disabled" : ""}`}>Import roadmap JSON<input disabled={busy} type="file" accept="application/json,.json" onChange={importRoadmap} /></label>
        <button className="btn accent" disabled={busy} onClick={() => editTopic()}>+ Add topic</button>
      </div>
    </div>

    {Object.entries(grouped).map(([track, items]) => {
      const roots = rootTopicsForTrack(track);
      const isTrackCollapsed = collapsedTracks[track] ?? false;
      const allExpanded = items.length > 0 && items.every((t) => expanded[t.id]);
      const trackSessions = sessions.filter((s) => items.some((t) => t.id === s.topicId));
      const trackDone = trackSessions.filter((s) => s.status === "done").length;
      return <section className={`track track-section ${isTrackCollapsed ? "track-collapsed" : ""}`} key={track}>
        <div className="track-title track-title-actions">
          <button className="track-toggle" onClick={() => setCollapsedTracks((x) => ({ ...x, [track]: !isTrackCollapsed }))}>{isTrackCollapsed ? "+" : "−"}</button>
          <div><h2>{track}</h2><small>{trackDone}/{trackSessions.length} sessions done · {items.length} topics</small></div>
          <div className="track-line" />
          <div className="actions">
            <button className="btn small ghost" onClick={() => openCheatsheet(items.map((t) => t.id))}>Cheatsheet</button>
            {!isTrackCollapsed && <button className="btn small ghost" onClick={() => setTrackExpansion(track, !allExpanded)}>{allExpanded ? "Collapse all topics" : "Expand all topics"}</button>}
          </div>
        </div>
        {!isTrackCollapsed && <div className="topic-stack topic-tree">{roots.map((t, index) => renderTopicRow(t, [index + 1], 0))}</div>}
      </section>;
    })}

    {topicEditor && <div className="modal-backdrop" onMouseDown={() => !busy && setTopicEditor(null)}><form className="modal card" onSubmit={saveTopic} onMouseDown={(e) => e.stopPropagation()}>
      <div className="section-head"><div><div className="eyebrow">Roadmap topic</div><h2>{topicEditor.id ? "Edit topic" : topicEditor.draft.parentTopicId ? "Add sub-topic" : "Add topic"}</h2></div><button type="button" className="icon-btn" onClick={() => setTopicEditor(null)}>×</button></div>
      <div className="form-grid">
        <Field label="Title"><input required className="input" value={topicEditor.draft.title} onChange={(e) => setTopicEditor((x) => x && ({ ...x, draft: { ...x.draft, title: e.target.value } }))} /></Field>
        <Field label="Slug"><input required className="input" value={topicEditor.draft.slug} onChange={(e) => setTopicEditor((x) => x && ({ ...x, draft: { ...x.draft, slug: e.target.value } }))} /></Field>
        <Field label="Track"><input required className="input" value={topicEditor.draft.track} onChange={(e) => setTopicEditor((x) => x && ({ ...x, draft: { ...x.draft, track: e.target.value, parentTopicId: null } }))} /></Field>
        <Field label="Parent topic"><select className="select" value={topicEditor.draft.parentTopicId || ""} onChange={(e) => {
          const parentId = e.target.value || null;
          const parent = parentId ? topicById.get(parentId) : null;
          setTopicEditor((x) => x && ({ ...x, draft: { ...x.draft, parentTopicId: parentId, track: parent?.track || x.draft.track } }));
        }}><option value="">No parent — top level</option>{parentOptions.map((t) => <option value={t.id} key={t.id}>{"· ".repeat(Math.min(topicDepth(t.id), 3))}{t.title}</option>)}</select></Field>
        <Field label="Order"><input type="number" className="input" value={topicEditor.draft.order} onChange={(e) => setTopicEditor((x) => x && ({ ...x, draft: { ...x.draft, order: Number(e.target.value) } }))} /></Field>
        <Field label="Stage"><select className="select" value={topicEditor.draft.stage} onChange={(e) => setTopicEditor((x) => x && ({ ...x, draft: { ...x.draft, stage: e.target.value } }))}><option>foundation</option><option>core</option><option>advanced</option></select></Field>
      </div>
      <div className="hierarchy-help">Parent topics are organizational containers. Prefer putting sessions only on leaf topics; existing sessions are never moved or deleted automatically.</div>
      <Field label="Summary"><textarea className="textarea" value={topicEditor.draft.summary} onChange={(e) => setTopicEditor((x) => x && ({ ...x, draft: { ...x.draft, summary: e.target.value } }))} /></Field>
      <Field label="Must know — comma or line separated"><textarea className="textarea small-area" value={topicEditor.draft.mustKnowText} onChange={(e) => setTopicEditor((x) => x && ({ ...x, draft: { ...x.draft, mustKnowText: e.target.value } }))} /></Field>
      <div className="actions end"><button type="button" className="btn secondary" onClick={() => setTopicEditor(null)}>Cancel</button><button disabled={busy} className="btn accent">{busy ? "Saving…" : "Save topic"}</button></div>
    </form></div>}

    {sessionEditor && <div className="modal-backdrop" onMouseDown={() => !busy && setSessionEditor(null)}><form className="modal card wide-modal" onSubmit={saveSession} onMouseDown={(e) => e.stopPropagation()}>
      <div className="section-head"><div><div className="eyebrow">Concrete study unit</div><h2>{sessionEditor.id ? "Edit session" : "Add session"}</h2></div><button type="button" className="icon-btn" onClick={() => setSessionEditor(null)}>×</button></div>
      <div className="form-grid"><Field label="Session title"><input required className="input" value={sessionEditor.draft.title} onChange={(e) => setSessionEditor((x) => x && ({ ...x, draft: { ...x.draft, title: e.target.value } }))} /></Field><Field label="Slug"><input required className="input" value={sessionEditor.draft.slug} onChange={(e) => setSessionEditor((x) => x && ({ ...x, draft: { ...x.draft, slug: e.target.value } }))} /></Field><Field label="Order"><input type="number" className="input" value={sessionEditor.draft.order} onChange={(e) => setSessionEditor((x) => x && ({ ...x, draft: { ...x.draft, order: Number(e.target.value) } }))} /></Field><Field label="Minutes"><input type="number" className="input" value={sessionEditor.draft.estimatedMinutes} onChange={(e) => setSessionEditor((x) => x && ({ ...x, draft: { ...x.draft, estimatedMinutes: Number(e.target.value) } }))} /></Field></div>
      <Field label="Objective"><textarea className="textarea small-area" value={sessionEditor.draft.objective} onChange={(e) => setSessionEditor((x) => x && ({ ...x, draft: { ...x.draft, objective: e.target.value } }))} /></Field>
      <div className="form-grid"><Field label="In scope — one per line"><textarea className="textarea" value={sessionEditor.draft.scopeText} onChange={(e) => setSessionEditor((x) => x && ({ ...x, draft: { ...x.draft, scopeText: e.target.value } }))} /></Field><Field label="Exit criteria — one per line"><textarea className="textarea" value={sessionEditor.draft.outcomesText} onChange={(e) => setSessionEditor((x) => x && ({ ...x, draft: { ...x.draft, outcomesText: e.target.value } }))} /></Field></div>
      <div className="actions end"><button type="button" className="btn secondary" onClick={() => setSessionEditor(null)}>Cancel</button><button disabled={busy} className="btn accent">{busy ? "Saving…" : "Save session"}</button></div>
    </form></div>}

    {cheatsheetOpen && <div className="modal-backdrop" onMouseDown={() => setCheatsheetOpen(false)}><div className="modal card cheatsheet-modal" onMouseDown={(e) => e.stopPropagation()}>
      <div className="section-head"><div><div className="eyebrow">A4 memory sheet</div><h2>Cheatsheet prompt builder</h2><p className="section-note">Select one topic, several sibling topics, or an entire track. Selecting a parent automatically includes all descendant sub-topics and their sessions in the generated command.</p></div><button className="icon-btn" onClick={() => setCheatsheetOpen(false)}>×</button></div>
      <div className="cheatsheet-layout">
        <div className="cheatsheet-picker">
          <input className="input" placeholder="Search TCP, memory, EF Core…" value={cheatsheetSearch} onChange={(e) => setCheatsheetSearch(e.target.value)} />
          <div className="cheatsheet-picker-actions"><button className="btn small ghost" onClick={() => setCheatsheetSelection(new Set())}>Clear</button><span>{cheatsheetSelection.size} selected</span></div>
          <div className="cheatsheet-topic-list">{cheatsheetVisibleTopics.map((t) => <label className={`cheatsheet-topic-row ${cheatsheetSelection.has(t.id) ? "selected" : ""}`} key={t.id} style={{ paddingLeft: `${10 + Math.min(topicDepth(t.id), 4) * 16}px` }}><input type="checkbox" checked={cheatsheetSelection.has(t.id)} onChange={() => toggleCheatsheetTopic(t.id)} /><span><strong>{t.title}</strong><small>{t.track}{getChildren(t.id).length ? ` · includes ${getChildren(t.id).length} direct sub-topics` : ` · ${(sessionsByTopic[t.id] || []).length} sessions`}</small></span></label>)}</div>
        </div>
        <div className="cheatsheet-output">
          <div className="cheatsheet-output-head"><div><strong>Copy this command to ChatGPT</strong><small>It asks for standalone A4 HTML that you can open and Print → Save as PDF.</small></div><button className="btn accent" disabled={!cheatsheetSelection.size} onClick={copyCheatsheetPrompt}>{cheatsheetCopied ? "Copied ✓" : "Copy prompt"}</button></div>
          <textarea className="textarea cheatsheet-prompt" readOnly value={cheatsheetPrompt} onFocus={(e) => e.currentTarget.select()} />
        </div>
      </div>
    </div></div>}
  </>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="field"><label>{label}</label>{children}</div>; }
