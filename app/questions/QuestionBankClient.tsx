"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type SourceRow = {
  id:string;
  slug:string;
  sourceKey:string;
  title:string;
  order:number;
  status:string;
  objective?:string;
  scope?:string[];
  outcomes?:string[];
  topicId:string;
  topicSlug:string;
  topicTitle:string;
  track:string;
  questionCount:number;
  unprintedCount:number;
  isVirtual:boolean;
};

type SourceStats = { totalQuestions:number; mappedQuestions:number; unassignedQuestions:number; unprintedQuestions:number };
type Question = {
  id:string; externalId?:string|null; topicSlug:string; sessionSlug?:string|null; type:string; format:string; difficulty:number;
  questionMd:string; answerMd:string; options?:string[]; correctOptionIndexes?:number[]; concepts?:string[]; tags?:string[];
  lastPrintedAt?:string|null; printCount?:number;
};
type BrowseResponse = { items:Question[]; total:number; limit:number; offset:number };
type RecentSession = { id:string; name:string; sourceSessionSlugs:string[]; targetQuestionCount:number; status:string; updatedAt:string };

const TYPES = ["recall","explain","compare","application","debug","design","cross_topic","misconception"];

export default function QuestionBankClient({ initialTopic = "" }:{ initialTopic?:string }) {
  const [sources,setSources] = useState<SourceRow[]>([]);
  const [stats,setStats] = useState<SourceStats>({ totalQuestions:0, mappedQuestions:0, unassignedQuestions:0, unprintedQuestions:0 });
  const [recent,setRecent] = useState<RecentSession[]>([]);
  const [selectedSources,setSelectedSources] = useState<Set<string>>(new Set());
  const [sourceSearch,setSourceSearch] = useState("");
  const [sourceMode,setSourceMode] = useState<"with"|"new"|"all">("with");
  const [items,setItems] = useState<Question[]>([]);
  const [total,setTotal] = useState(0);
  const [offset,setOffset] = useState(0);
  const [loadingSources,setLoadingSources] = useState(true);
  const [loadingQuestions,setLoadingQuestions] = useState(false);
  const [query,setQuery] = useState("");
  const [format,setFormat] = useState("");
  const [type,setType] = useState("");
  const [difficulty,setDifficulty] = useState("");
  const [printState,setPrintState] = useState("");
  const [selectedQuestions,setSelectedQuestions] = useState<Set<string>>(new Set());
  const [revisionName,setRevisionName] = useState("");
  const [targetCount,setTargetCount] = useState(30);
  const [creating,setCreating] = useState(false);
  const [assignTarget,setAssignTarget] = useState("");
  const [repairing,setRepairing] = useState(false);
  const [transfer,setTransfer] = useState("");
  const [copied,setCopied] = useState(false);
  const limit = 30;

  async function loadSources(preselect = false) {
    setLoadingSources(true);
    try {
      const [sourceRes,recentRes] = await Promise.all([fetch("/api/questions/sources?view=v2"),fetch("/api/revision-sessions")]);
      if (!sourceRes.ok) throw new Error("Could not load question sources");
      const payload = await sourceRes.json();
      const rows:SourceRow[] = payload.sources || [];
      setSources(rows);
      setStats(payload.stats || { totalQuestions:0, mappedQuestions:0, unassignedQuestions:0, unprintedQuestions:0 });
      if (recentRes.ok) setRecent(await recentRes.json());
      if ((preselect || selectedSources.size === 0) && initialTopic) {
        const matches = rows.filter((x) => x.topicSlug === initialTopic && x.questionCount > 0).map((x) => x.sourceKey);
        if (matches.length) setSelectedSources(new Set(matches));
      }
    } finally { setLoadingSources(false); }
  }

  useEffect(() => { loadSources(true); }, []);

  const selectedRows = useMemo(() => sources.filter((x) => selectedSources.has(x.sourceKey)),[sources,selectedSources]);
  const selectedVirtualRows = useMemo(() => selectedRows.filter((x) => x.isVirtual),[selectedRows]);
  const singleRepairSource = selectedVirtualRows.length === 1 ? selectedVirtualRows[0] : null;
  const scopeQuestionCount = useMemo(() => selectedRows.reduce((n,x) => n + x.questionCount,0),[selectedRows]);
  const scopeNewCount = useMemo(() => selectedRows.reduce((n,x) => n + x.unprintedCount,0),[selectedRows]);
  const scopeKey = useMemo(() => Array.from(selectedSources).sort().join(","),[selectedSources]);

  const visibleSources = useMemo(() => {
    const needle = sourceSearch.trim().toLowerCase();
    return sources.filter((x) => {
      if (sourceMode === "with" && x.questionCount === 0) return false;
      if (sourceMode === "new" && x.unprintedCount === 0) return false;
      if (!needle) return true;
      return `${x.track} ${x.topicTitle} ${x.title} ${x.slug}`.toLowerCase().includes(needle);
    });
  },[sources,sourceSearch,sourceMode]);

  const grouped = useMemo(() => {
    const out:Record<string,Record<string,SourceRow[]>> = {};
    for (const row of visibleSources) {
      (out[row.track] ||= {});
      (out[row.track][row.topicTitle] ||= []).push(row);
    }
    return out;
  },[visibleSources]);

  async function browse(nextOffset = 0) {
    if (!scopeKey) { setItems([]); setTotal(0); setOffset(0); return; }
    setLoadingQuestions(true);
    try {
      const p = new URLSearchParams({ sources:scopeKey, limit:String(limit), offset:String(nextOffset) });
      if (query.trim()) p.set("q",query.trim());
      if (format) p.set("format",format);
      if (type) p.set("type",type);
      if (difficulty) p.set("difficulty",difficulty);
      if (printState) p.set("print",printState);
      const res = await fetch(`/api/questions/browse?${p}`);
      if (!res.ok) throw new Error("Could not browse selected questions");
      const data:BrowseResponse = await res.json();
      setItems(data.items || []); setTotal(data.total || 0); setOffset(data.offset || 0);
    } catch (error) {
      setTransfer(error instanceof Error ? error.message : "Could not load questions");
      setItems([]); setTotal(0);
    } finally { setLoadingQuestions(false); }
  }

  useEffect(() => {
    const t = setTimeout(() => { browse(0); },180);
    return () => clearTimeout(t);
  },[scopeKey,query,format,type,difficulty,printState]);

  function toggleSource(sourceKey:string) {
    setSelectedSources((current) => { const next = new Set(current); next.has(sourceKey) ? next.delete(sourceKey) : next.add(sourceKey); return next; });
    setSelectedQuestions(new Set());
  }

  function toggleTopic(rows:SourceRow[]) {
    const useful = rows.filter((x) => x.questionCount > 0);
    const all = useful.length > 0 && useful.every((x) => selectedSources.has(x.sourceKey));
    setSelectedSources((current) => {
      const next = new Set(current);
      useful.forEach((x) => all ? next.delete(x.sourceKey) : next.add(x.sourceKey));
      return next;
    });
    setSelectedQuestions(new Set());
  }

  function toggleQuestion(id:string) {
    setSelectedQuestions((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function idsForCurrentScope() {
    const p = new URLSearchParams({ sources:scopeKey, idsOnly:"true" });
    if (query.trim()) p.set("q",query.trim());
    if (format) p.set("format",format);
    if (type) p.set("type",type);
    if (difficulty) p.set("difficulty",difficulty);
    if (printState) p.set("print",printState);
    const res = await fetch(`/api/questions/browse?${p}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not select filtered questions");
    return (data.ids || []) as string[];
  }

  async function selectAllFiltered() {
    if (!scopeKey) return;
    try { setSelectedQuestions(new Set(await idsForCurrentScope())); }
    catch (error) { setTransfer(error instanceof Error ? error.message : "Selection failed"); }
  }

  async function createRevision(usePicked:boolean) {
    if (!scopeKey && selectedQuestions.size === 0) return;
    setCreating(true);
    try {
      const questionIds = usePicked && selectedQuestions.size ? Array.from(selectedQuestions) : await idsForCurrentScope();
      if (!questionIds.length) throw new Error("No questions match the current scope and filters.");
      const normalSlugs = selectedRows.filter((x) => !x.isVirtual).map((x) => x.slug);
      const defaultName = selectedRows.length === 1 ? selectedRows[0].title : selectedRows.length ? `${selectedRows[0].topicTitle} + ${selectedRows.length - 1} sources` : "Custom revision";
      const res = await fetch("/api/revision-sessions",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        name:revisionName.trim() || defaultName,
        sourceSessionSlugs:normalSlugs,
        questionIds,
        targetQuestionCount:Math.min(targetCount,questionIds.length),
        recommendationMode:"balanced",
      }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create revision session");
      window.location.href = `/review/session/${data.id}`;
    } catch (error) {
      setTransfer(error instanceof Error ? error.message : "Could not create revision session");
      setCreating(false);
    }
  }

  async function assignQuestionIds(questionIds:string[], moveScopeToTarget = false) {
    if (!questionIds.length || !assignTarget) return;
    setRepairing(true);
    try {
      const res = await fetch("/api/questions/assign",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ questionIds,sessionSlug:assignTarget }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not move questions");
      setTransfer(`Assigned ${data.updated} question${data.updated === 1 ? "" : "s"} to ${data.sessionSlug}. Review and print history were preserved.`);
      setSelectedQuestions(new Set());
      if (moveScopeToTarget) setSelectedSources(new Set([data.sessionSlug]));
      setAssignTarget("");
      await loadSources();
      if (!moveScopeToTarget) await browse(0);
    } catch (error) {
      setTransfer(error instanceof Error ? error.message : "Could not move questions");
    } finally { setRepairing(false); }
  }

  async function assignSelected() {
    if (!selectedQuestions.size || !assignTarget) return;
    await assignQuestionIds(Array.from(selectedQuestions));
  }

  async function assignEntireUnassignedSource() {
    if (!singleRepairSource || !assignTarget) return;
    setRepairing(true);
    try {
      const p = new URLSearchParams({ sources:singleRepairSource.sourceKey, idsOnly:"true" });
      const res = await fetch(`/api/questions/browse?${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the unassigned questions");
      const ids = (data.ids || []) as string[];
      if (!ids.length) throw new Error("This repair bucket could not be read. Refresh the page and try again.");
      // assignQuestionIds owns the final loading state. Reset first so the nested call can
      // accurately reflect its own lifecycle.
      setRepairing(false);
      await assignQuestionIds(ids,true);
    } catch (error) {
      setTransfer(error instanceof Error ? error.message : "Could not repair this source");
      setRepairing(false);
    }
  }

  async function importFile(e:ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setTransfer("Importing…");
      const payload = JSON.parse(await file.text());
      const res = await fetch("/api/questions/import",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setTransfer(`Imported ${data.inserted} · skipped ${data.skipped}. ${data.message || ""}`);
      await loadSources();
      await browse(0);
    } catch (error) { setTransfer(`Import failed: ${error instanceof Error ? error.message : "invalid file"}`); }
    finally { e.target.value = ""; }
  }

  async function copyGenerationPrompt() {
    if (!selectedRows.length) return;
    const concrete = selectedRows.filter((x) => !x.isVirtual);
    if (!concrete.length) { setTransfer("Assign those questions to roadmap sessions before generating more for that source."); return; }
    const source = concrete.map((s,i) => `${i+1}. ${s.track} → ${s.topicTitle} → ${s.title}\n   topic: ${s.topicSlug}\n   session: ${s.slug}\n   objective: ${s.objective || ""}\n   scope: ${(s.scope || []).join("; ")}\n   exit criteria: ${(s.outcomes || []).join("; ")}`).join("\n\n");
    const prompt = `RECALL FORGE — REVISION QUESTION GENERATOR\n\nGenerate ${Math.max(30,targetCount)} deep revision questions across ONLY these sessions:\n\n${source}\n\nCRITICAL IMPORT CONTRACT\n- Every question MUST contain \"topic\" equal to the exact topic slug shown above.\n- Every question MUST contain \"session\" equal to the exact session slug shown above. Never use the human-readable title in this field.\n- Return ONLY JSON as {\"questions\":[...]}.\n- Mix open Q→A with diagnostic multi_select questions. multi_select has exactly 4 options and 0–4 may be correct.\n- Include concepts, prerequisiteQuestionIds, relatedQuestionIds, keyPoints, commonMistakes and tags.\n- Stay inside the selected sessions and favor mechanism, traces, debugging and misconceptions over trivia.`;
    await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false),1600);
  }

  const normalTargets = sources.filter((x) => !x.isVirtual);
  const repairTargets = singleRepairSource && singleRepairSource.topicId !== "__unknown__"
    ? normalTargets.filter((x) => x.topicId === singleRepairSource.topicId)
    : normalTargets;
  const pageAllSelected = items.length > 0 && items.every((x) => selectedQuestions.has(x.id));

  return <div className="qbx-workspace">
    <section className="qbx-stats">
      <div><span>Library</span><strong>{stats.totalQuestions}</strong><small>questions</small></div>
      <div><span>New cards</span><strong>{stats.unprintedQuestions}</strong><small>not printed yet</small></div>
      <div className={stats.unassignedQuestions ? "warn" : ""}><span>Needs assignment</span><strong>{stats.unassignedQuestions}</strong><small>{stats.unassignedQuestions ? "visible below — nothing is hidden" : "all mapped"}</small></div>
      <div><span>Current scope</span><strong>{scopeQuestionCount}</strong><small>{selectedSources.size} source{selectedSources.size === 1 ? "" : "s"} · {scopeNewCount} new</small></div>
    </section>

    <section className="qbx-toolbar card-flat">
      <div><strong>Question data</strong><span>Imports are canonicalized against your roadmap. Anything that cannot be matched appears in <b>Needs assignment</b> instead of disappearing as “0 questions”.</span>{transfer && <em>{transfer}</em>}</div>
      <div className="actions"><label className="btn small secondary file-btn">Import JSON<input type="file" accept="application/json,.json" onChange={importFile}/></label><a className="btn small ghost" href="/api/data/export">Export</a></div>
    </section>

    <div className="qbx-layout">
      <aside className="qbx-navigator card-flat">
        <div className="qbx-nav-head"><div><div className="eyebrow">1 · Sources</div><strong>Pick sessions</strong></div><button className="btn tiny ghost" onClick={() => {setSelectedSources(new Set());setSelectedQuestions(new Set());}}>Clear</button></div>
        <input className="input" value={sourceSearch} onChange={(e) => setSourceSearch(e.target.value)} placeholder="Find TCP, routing, GC…"/>
        <div className="qbx-source-tabs"><button className={sourceMode === "with" ? "active" : ""} onClick={() => setSourceMode("with")}>With questions</button><button className={sourceMode === "new" ? "active" : ""} onClick={() => setSourceMode("new")}>New / unprinted</button><button className={sourceMode === "all" ? "active" : ""} onClick={() => setSourceMode("all")}>All roadmap</button></div>
        <div className="qbx-source-tree">
          {loadingSources ? <div className="empty compact">Loading roadmap…</div> : !Object.keys(grouped).length ? <div className="empty compact">No source matches this view.</div> : Object.entries(grouped).map(([track,topicGroups]) => {
            const trackRows = Object.values(topicGroups).flat(); const trackCount = trackRows.reduce((n,x) => n+x.questionCount,0);
            return <details className="qbx-track" key={track} open={track === "Needs attention" || !!sourceSearch}><summary><span>{track}</span><b>{trackCount} Q</b></summary><div className="qbx-track-body">{Object.entries(topicGroups).map(([topicTitle,rows]) => {
              const topicCount = rows.reduce((n,x) => n+x.questionCount,0); const topicNew = rows.reduce((n,x) => n+x.unprintedCount,0);
              return <details className="qbx-topic" key={`${track}-${topicTitle}`} open={rows.some((x) => x.isVirtual) || !!sourceSearch}><summary><span><strong>{topicTitle}</strong><small>{topicCount} questions{topicNew ? ` · ${topicNew} new` : ""}</small></span><i>⌄</i></summary><div className="qbx-topic-tools"><button onClick={() => toggleTopic(rows)}>Toggle topic</button></div><div className="qbx-session-list">{rows.map((row) => <label className={`qbx-session ${selectedSources.has(row.sourceKey) ? "selected" : ""} ${row.isVirtual ? "unassigned" : ""} ${row.questionCount === 0 ? "empty" : ""}`} key={row.sourceKey}><input type="checkbox" checked={selectedSources.has(row.sourceKey)} disabled={row.questionCount === 0} onChange={() => toggleSource(row.sourceKey)}/><span><strong>{row.isVirtual ? "⚠ Needs assignment" : row.title}</strong><small>{row.isVirtual ? "Imported, but source session could not be resolved" : row.status}</small></span><b>{row.questionCount}<small>Q</small>{row.unprintedCount > 0 && <em>{row.unprintedCount} new</em>}</b></label>)}</div></details>;
            })}</div></details>;
          })}
        </div>
      </aside>

      <main className="qbx-browser card-flat">
        <div className="qbx-browser-head"><div><div className="eyebrow">2 · Question scope</div><h2>{selectedSources.size ? `${total} matching questions` : "Choose one or more sessions"}</h2></div>{selectedSources.size > 0 && <div className="qbx-scope-chips">{selectedRows.slice(0,4).map((x) => <button key={x.sourceKey} onClick={() => toggleSource(x.sourceKey)}>{x.isVirtual ? "Needs assignment" : x.title} ×</button>)}{selectedRows.length > 4 && <span>+{selectedRows.length-4}</span>}</div>}</div>

        {singleRepairSource && <section className="qbx-repair-inline">
          <div><div className="eyebrow">Repair imported questions</div><strong>{singleRepairSource.questionCount} question{singleRepairSource.questionCount === 1 ? "" : "s"} are here — they just need the correct session.</strong><span>Choose the destination once. Recall Forge will repair the whole bucket without touching grades, review timing or print history.</span></div>
          <select className="select" value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)}><option value="">Choose the correct session…</option>{repairTargets.map((x) => <option value={x.slug} key={x.slug}>{x.title}</option>)}</select>
          <button className="btn accent" disabled={!assignTarget || repairing} onClick={assignEntireUnassignedSource}>{repairing ? "Repairing…" : `Assign all ${singleRepairSource.questionCount} →`}</button>
        </section>}

        {selectedVirtualRows.length > 1 && <div className="qbx-repair-note">Select one <b>Needs assignment</b> bucket at a time for one-click repair. You can still inspect and hand-pick questions from several buckets together.</div>}

        {selectedSources.size > 0 && <div className="qbx-filters"><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search question, answer, concept, tag…"/><select className="select" value={printState} onChange={(e) => setPrintState(e.target.value)}><option value="">Printed + unprinted</option><option value="unprinted">Not printed yet</option><option value="printed">Already printed</option></select><select className="select" value={format} onChange={(e) => setFormat(e.target.value)}><option value="">All formats</option><option value="open">Open Q → A</option><option value="multi_select">4-option</option></select><select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">All levels</option>{[1,2,3,4,5,6].map((x) => <option value={x} key={x}>L{x}</option>)}</select><select className="select" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></div>}

        {!selectedSources.size ? <div className="qbx-empty"><strong>Start with the roadmap, not a giant list.</strong><p>Select one session, a whole topic, or several sessions from different topics. Only that slice is fetched into the browser.</p></div> : loadingQuestions ? <div className="empty">Loading this scope…</div> : <>
          <div className="qbx-selection-bar"><div><strong>{selectedQuestions.size}</strong><span>hand-picked</span></div><div className="actions"><button className="btn tiny ghost" onClick={() => setSelectedQuestions((current) => { const next = new Set(current); items.forEach((x) => pageAllSelected ? next.delete(x.id) : next.add(x.id)); return next; })}>{pageAllSelected ? "Unselect page" : "Select page"}</button><button className="btn tiny ghost" onClick={selectAllFiltered}>Select all {total}</button>{selectedQuestions.size > 0 && <button className="btn tiny ghost" onClick={() => setSelectedQuestions(new Set())}>Clear picked</button>}</div></div>
          {!items.length ? <div className="qbx-empty"><strong>No questions in this exact view.</strong><p>{singleRepairSource ? "This repair bucket should contain questions. Refresh once after applying the patch; if it still shows zero, the status message above will expose the failed request instead of hiding it." : "Clear the filters or choose another source."}</p></div> : <div className="qbx-question-list">{items.map((question) => <article className={`qbx-question ${selectedQuestions.has(question.id) ? "picked" : ""}`} key={question.id}><label className="qbx-pick"><input type="checkbox" checked={selectedQuestions.has(question.id)} onChange={() => toggleQuestion(question.id)}/><span/></label><div className="qbx-question-main"><div className="qbx-question-meta"><span className={`badge ${question.format === "multi_select" ? "accent" : ""}`}>{question.format === "multi_select" ? "4-option" : "open"}</span><span className="badge level">L{question.difficulty}</span><span className="badge">{question.type}</span>{!question.lastPrintedAt ? <span className="badge qbx-new">NEW · unprinted</span> : <span className="badge">printed ×{question.printCount || 1}</span>}</div><strong>{question.questionMd}</strong>{question.format === "multi_select" && <div className="qbx-options">{(question.options || []).map((option,index) => <span key={index}><b>{String.fromCharCode(65+index)}</b>{option}</span>)}</div>}<details className="qbx-answer"><summary>Preview answer</summary><div>{question.answerMd}</div></details><small>{[...(question.concepts || []),...(question.tags || [])].slice(0,6).join(" · ")}</small></div></article>)}</div>}
          {total > limit && <div className="qbx-pager"><button className="btn small ghost" disabled={offset <= 0} onClick={() => browse(Math.max(0,offset-limit))}>← Previous</button><span>{offset+1}–{Math.min(offset+limit,total)} of {total}</span><button className="btn small ghost" disabled={offset+limit >= total} onClick={() => browse(offset+limit)}>Next →</button></div>}
        </>}
      </main>
    </div>

    <section className="qbx-action-dock card">
      <div className="qbx-build-title"><div className="eyebrow">3 · Build revision</div><strong>{selectedQuestions.size ? `${selectedQuestions.size} hand-picked questions` : `${total} questions in current filtered scope`}</strong><span>Pick exact questions when you care; otherwise the current scope + filters become the source.</span></div>
      <div className="qbx-build-fields"><input className="input" value={revisionName} onChange={(e) => setRevisionName(e.target.value)} placeholder="Revision name (optional)"/><label><span>Target</span><input className="input" type="number" min={1} max={100} value={targetCount} onChange={(e) => setTargetCount(Math.max(1,Math.min(100,Number(e.target.value)||30)))}/></label></div>
      <div className="qbx-build-actions"><button className="btn accent" disabled={!selectedSources.size || creating || total === 0} onClick={() => createRevision(selectedQuestions.size > 0)}>{creating ? "Building…" : selectedQuestions.size ? `Start with picked (${selectedQuestions.size}) →` : `Start from scope (${total}) →`}</button><button className="btn secondary" disabled={!selectedRows.some((x) => !x.isVirtual)} onClick={copyGenerationPrompt}>{copied ? "Copied ✓" : "Copy generation prompt"}</button></div>
    </section>

    {selectedQuestions.size > 0 && <section className="qbx-repair card-flat"><div><strong>Move / repair source</strong><span>This changes only topic/session association. Review history and print state stay intact.</span></div><select className="select" value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)}><option value="">Choose target roadmap session…</option>{normalTargets.map((x) => <option value={x.slug} key={x.slug}>{x.track} → {x.topicTitle} → {x.title}</option>)}</select><button className="btn secondary" disabled={!assignTarget || repairing} onClick={assignSelected}>{repairing ? "Moving…" : `Move ${selectedQuestions.size} selected`}</button></section>}

    <section className="qbx-recent card-flat"><div><div className="eyebrow">Recent revision sessions</div><strong>Resume instead of rebuilding</strong></div><div>{!recent.length ? <span className="muted">No revision sessions yet.</span> : recent.slice(0,8).map((session) => <Link href={`/review/session/${session.id}`} key={session.id}><span><strong>{session.name}</strong><small>{session.sourceSessionSlugs.length} sources · target {session.targetQuestionCount}</small></span><b>→</b></Link>)}</div></section>
  </div>;
}
