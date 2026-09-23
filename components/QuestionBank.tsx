"use client";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { Question } from "@/components/QuestionCard";
import { buildMultiSessionQuestionPrompt, type QuestionSourceSession } from "@/lib/questionGeneration";

type SourceRow = QuestionSourceSession & {
  id: string;
  order: number;
  status: string;
  topicId: string;
  questionCount: number;
};

type RevisionSession = { id:string; name:string; sourceSessionSlugs:string[]; targetQuestionCount:number; status:string; updatedAt:string; lastUsedAt?:string|null };

type BrowseResponse = { items: Question[]; total: number; limit: number; offset: number };

export default function QuestionBank({ initialTopic = "" }: { initialTopic?: string }) {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<RevisionSession[]>([]);
  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("");
  const [type, setType] = useState("");
  const [sourceSearch, setSourceSearch] = useState("");
  const [name, setName] = useState("");
  const [targetCount, setTargetCount] = useState(30);
  const [loadingSources, setLoadingSources] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [transfer, setTransfer] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const limit = 40;

  async function loadSources() {
    setLoadingSources(true);
    const [a, b] = await Promise.all([fetch("/api/questions/sources"), fetch("/api/revision-sessions")]);
    const sourceRows: SourceRow[] = await a.json();
    setSources(sourceRows);
    setRecent(await b.json());
    setLoadingSources(false);
    if (initialTopic && selected.size === 0) {
      const initial = sourceRows.filter((s) => s.topicSlug === initialTopic && s.questionCount > 0).map((s) => s.slug);
      if (initial.length) setSelected(new Set(initial));
    }
  }

  useEffect(() => { loadSources(); }, []);

  const selectedRows = useMemo(() => sources.filter((s) => selected.has(s.slug)), [sources, selected]);
  const selectedQuestionCount = useMemo(() => selectedRows.reduce((sum, s) => sum + s.questionCount, 0), [selectedRows]);
  const filteredSources = useMemo(() => {
    const needle = sourceSearch.trim().toLowerCase();
    return sources.filter((s) => !needle || `${s.track} ${s.topicTitle} ${s.title} ${s.slug}`.toLowerCase().includes(needle));
  }, [sources, sourceSearch]);
  const grouped = useMemo(() => {
    const out: Record<string, Record<string, SourceRow[]>> = {};
    for (const s of filteredSources) {
      out[s.track] ||= {};
      out[s.track][s.topicTitle] ||= [];
      out[s.track][s.topicTitle].push(s);
    }
    return out;
  }, [filteredSources]);

  async function browse(nextOffset = 0) {
    if (!selected.size) { setItems([]); setTotal(0); setOffset(0); return; }
    setLoadingQuestions(true);
    const p = new URLSearchParams({ sessions: Array.from(selected).join(","), limit: String(limit), offset: String(nextOffset) });
    if (search.trim()) p.set("q", search.trim());
    if (format) p.set("format", format);
    if (type) p.set("type", type);
    const r = await fetch(`/api/questions/browse?${p}`);
    const out: BrowseResponse = await r.json();
    setItems(out.items || []);
    setTotal(out.total || 0);
    setOffset(out.offset || 0);
    setLoadingQuestions(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => { browse(0); }, 180);
    return () => clearTimeout(timer);
  }, [Array.from(selected).sort().join("|"), search, format, type]);

  function toggleSource(slug: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  function toggleTopic(rows: SourceRow[]) {
    const useful = rows.filter((x) => x.questionCount > 0);
    const all = useful.length > 0 && useful.every((x) => selected.has(x.slug));
    setSelected((current) => {
      const next = new Set(current);
      for (const row of useful) all ? next.delete(row.slug) : next.add(row.slug);
      return next;
    });
  }

  async function createRevisionSession() {
    if (!selected.size) return;
    setCreating(true);
    try {
      const defaultName = selectedRows.length === 1 ? selectedRows[0].title : `${selectedRows[0]?.topicTitle || "Revision"} + ${selectedRows.length - 1} sessions`;
      const r = await fetch("/api/revision-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: name.trim() || defaultName,
        sourceSessionSlugs: Array.from(selected),
        targetQuestionCount: targetCount,
        recommendationMode: "balanced",
      }) });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || "Could not create revision session");
      window.location.href = `/review/session/${out.id}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not create revision session");
      setCreating(false);
    }
  }

  async function copyGenerationPrompt() {
    if (!selectedRows.length) return;
    const prompt = buildMultiSessionQuestionPrompt(selectedRows, Math.max(30, targetCount));
    await navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1800);
  }

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setTransfer("Importing…");
      const data = JSON.parse(await file.text());
      const r = await fetch("/api/questions/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || "Import failed");
      setTransfer(`Imported ${out.inserted} questions · skipped ${out.skipped}.`);
      await loadSources();
      await browse(0);
    } catch (err: any) {
      setTransfer(`Import failed: ${err.message}`);
    } finally { e.target.value = ""; }
  }

  return <div className="qb-workspace">
    <section className="qb-builder card">
      <div className="qb-builder-head">
        <div><div className="eyebrow">Revision session builder</div><h2>Choose the exact roadmap sessions that feed this revision.</h2><p className="muted">Question Bank no longer downloads the whole library. Pick one or many source sessions; Recall Forge loads only that slice and can blend in graph-neighbor recommendations.</p></div>
        <div className="qb-selected-stat"><strong>{selected.size}</strong><span>source sessions</span><small>{selectedQuestionCount} available questions</small></div>
      </div>
      <div className="qb-build-controls">
        <div className="field"><label>Revision session name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TCP reliability + congestion" /></div>
        <div className="field"><label>Question target</label><input className="input" type="number" min={5} max={100} value={targetCount} onChange={(e) => setTargetCount(Math.max(5, Math.min(100, Number(e.target.value) || 30)))} /></div>
        <button className="btn accent qb-create" disabled={!selected.size || creating} onClick={createRevisionSession}>{creating ? "Building…" : "Build & start →"}</button>
      </div>
      <div className="qb-generation-strip"><div><strong>Need questions for these sources?</strong><span>Generate a mixed open + 4-option diagnostic set with concept/prerequisite graph metadata.</span></div><button className="btn small secondary" disabled={!selected.size} onClick={copyGenerationPrompt}>{promptCopied ? "Copied ✓" : "Copy generation prompt"}</button></div>
    </section>

    <div className="qb-grid">
      <aside className="qb-sources card-flat">
        <div className="qb-panel-head"><div><strong>1 · Source sessions</strong><small>Multiple selection supported</small></div><button className="btn tiny ghost" onClick={() => setSelected(new Set())}>Clear</button></div>
        <input className="input" value={sourceSearch} onChange={(e) => setSourceSearch(e.target.value)} placeholder="Find DHCP, TCP, page faults…" />
        <div className="qb-source-scroll">
          {loadingSources ? <div className="empty compact">Loading sources…</div> : Object.entries(grouped).map(([track, topics]) => <div className="qb-track" key={track}><div className="qb-track-title">{track}</div>{Object.entries(topics).map(([topicTitle, rows]) => {
            const useful = rows.filter((x) => x.questionCount > 0);
            const all = useful.length > 0 && useful.every((x) => selected.has(x.slug));
            return <div className="qb-topic" key={`${track}-${topicTitle}`}><button className={`qb-topic-head ${all ? "selected" : ""}`} onClick={() => toggleTopic(rows)}><span>{all ? "✓" : "+"}</span><strong>{topicTitle}</strong><small>{useful.reduce((n, x) => n + x.questionCount, 0)} Q</small></button>{rows.map((s) => <label className={`qb-source-row ${selected.has(s.slug) ? "selected" : ""} ${s.questionCount === 0 ? "empty-source" : ""}`} key={s.slug}><input type="checkbox" disabled={s.questionCount === 0} checked={selected.has(s.slug)} onChange={() => toggleSource(s.slug)} /><span><strong>{s.title}</strong><small>{s.questionCount ? `${s.questionCount} questions` : "no questions imported"} · {s.status}</small></span></label>)}</div>})}</div>)}
        </div>
      </aside>

      <main className="qb-browser card-flat">
        <div className="qb-panel-head"><div><strong>2 · Questions in scope</strong><small>{selected.size ? `${total} matching · loaded ${items.length}` : "Select source sessions first"}</small></div></div>
        <div className="qb-browser-filters"><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search question, answer, tag or concept…" /><select className="select" value={format} onChange={(e) => setFormat(e.target.value)}><option value="">All formats</option><option value="open">Open Q → A</option><option value="multi_select">4-option multi-select</option></select><select className="select" value={type} onChange={(e) => setType(e.target.value)}><option value="">All cognitive types</option>{["recall","explain","compare","application","debug","design","cross_topic","misconception"].map((x) => <option key={x}>{x}</option>)}</select></div>
        {!selected.size ? <div className="qb-zero"><strong>No giant question dump.</strong><p>Choose the roadmap sessions on the left. Only that subset is fetched from PostgreSQL.</p></div> : loadingQuestions ? <div className="empty">Loading selected slice…</div> : !items.length ? <div className="empty">No questions match this source/filter. Use “Copy generation prompt”, generate JSON in ChatGPT, then import it below.</div> : <div className="qb-question-preview">{items.map((q) => <article className="qb-question-row" key={q.id}><div className="qb-question-badges"><span className={`badge ${q.format === "multi_select" ? "accent" : ""}`}>{q.format === "multi_select" ? "4-option" : "open"}</span><span className="badge">L{q.difficulty}</span><span className="badge">{q.type}</span><span className="badge session-badge">{q.sessionSlug}</span></div><strong>{q.questionMd}</strong>{q.format === "multi_select" && <div className="qb-option-mini">{(q.options || []).map((o, i) => <span key={i}>{String.fromCharCode(65 + i)} · {o}</span>)}</div>}<small>{(q.concepts || q.tags || []).slice(0, 5).join(" · ")}</small></article>)}</div>}
        {total > limit && <div className="qb-pager"><button className="btn small ghost" disabled={offset <= 0} onClick={() => browse(Math.max(0, offset - limit))}>← Previous</button><span>{offset + 1}–{Math.min(offset + limit, total)} of {total}</span><button className="btn small ghost" disabled={offset + limit >= total} onClick={() => browse(offset + limit)}>Next →</button></div>}
      </main>
    </div>

    <section className="qb-bottom-grid">
      <div className="transfer-bar card-flat"><div><strong>Question data</strong><div className="muted">Import generated JSON. Existing question/review/print data is preserved; duplicate external IDs are skipped.</div>{transfer && <div className="inline-status">{transfer}</div>}</div><div className="actions"><label className="btn small secondary file-btn">Import JSON<input type="file" accept="application/json,.json" onChange={importFile} /></label><a className="btn small ghost" href="/api/data/export">Export my questions</a></div></div>
      <div className="card-flat qb-recent"><div className="qb-panel-head"><div><strong>Recent revision sessions</strong><small>Resume a deliberately bounded practice set</small></div></div>{!recent.length ? <div className="muted">No revision sessions yet.</div> : recent.slice(0, 8).map((s) => <Link className="qb-recent-row" key={s.id} href={`/review/session/${s.id}`}><span><strong>{s.name}</strong><small>{s.sourceSessionSlugs.length} sources · target {s.targetQuestionCount}</small></span><b>→</b></Link>)}</div>
    </section>
  </div>;
}
