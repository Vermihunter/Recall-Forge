"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useMemo, useState } from "react";

export type RoadmapTopic = {
  id: string; slug: string; title: string; track: string; order: number; summary: string; stage: string;
  mustKnow: string[]; progress: number; isSeed: boolean;
};
export type RoadmapSession = {
  id: string; topicId: string; slug: string; title: string; order: number; objective: string;
  scope: string[]; outcomes: string[]; estimatedMinutes: number; status: string; notes: string; isSeed: boolean;
};

type TopicDraft = Omit<RoadmapTopic, "id"|"progress"|"isSeed"> & { mustKnowText: string };
type SessionDraft = Omit<RoadmapSession, "id"|"isSeed"> & { scopeText: string; outcomesText: string };

const blankTopic = (): TopicDraft => ({ slug:"", title:"", track:"Custom", order:9999, summary:"", stage:"foundation", mustKnow:[], mustKnowText:"" });
const blankSession = (topicId=""): SessionDraft => ({ topicId, slug:"", title:"", order:1, objective:"", scope:[], scopeText:"", outcomes:[], outcomesText:"", estimatedMinutes:45, status:"todo", notes:"" });
const splitLines = (value:string) => value.split(/\n|,/).map(x=>x.trim()).filter(Boolean);

export default function RoadmapManager({ initialTopics, initialSessions }: { initialTopics: RoadmapTopic[]; initialSessions: RoadmapSession[] }) {
  const [topics,setTopics]=useState(initialTopics);
  const [sessions,setSessions]=useState(initialSessions);
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [topicEditor,setTopicEditor]=useState<{id?:string; draft:TopicDraft}|null>(null);
  const [sessionEditor,setSessionEditor]=useState<{id?:string; draft:SessionDraft}|null>(null);
  const [busy,setBusy]=useState(false);

  const grouped=useMemo(()=>topics.slice().sort((a,b)=>a.order-b.order).reduce((acc:Record<string,RoadmapTopic[]>,t)=>{(acc[t.track]??=[]).push(t);return acc;},{}),[topics]);
  const sessionsByTopic=useMemo(()=>sessions.reduce((acc:Record<string,RoadmapSession[]>,s)=>{(acc[s.topicId]??=[]).push(s);return acc;},{}),[sessions]);

  function editTopic(t?:RoadmapTopic){
    setTopicEditor({ id:t?.id, draft:t ? {...t, mustKnowText:(t.mustKnow||[]).join(", ")} : blankTopic() });
  }
  function editSession(topicId:string,s?:RoadmapSession){
    const nextOrder=(sessionsByTopic[topicId]?.length||0)+1;
    setSessionEditor({ id:s?.id, draft:s ? {...s,scopeText:(s.scope||[]).join("\n"),outcomesText:(s.outcomes||[]).join("\n")} : {...blankSession(topicId),order:nextOrder} });
  }
  async function saveTopic(e:FormEvent){
    e.preventDefault(); if(!topicEditor)return; setBusy(true);
    const d=topicEditor.draft; const body={...d,mustKnow:splitLines(d.mustKnowText)};
    const r=await fetch(topicEditor.id?`/api/topics/${topicEditor.id}`:"/api/topics",{method:topicEditor.id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const saved=await r.json(); setBusy(false); if(!r.ok)return alert(saved.error||"Could not save topic");
    setTopics(v=>topicEditor.id?v.map(x=>x.id===saved.id?saved:x):[...v,saved]); setTopicEditor(null);
  }
  async function saveSession(e:FormEvent){
    e.preventDefault(); if(!sessionEditor)return; setBusy(true);
    const d=sessionEditor.draft; const body={...d,scope:splitLines(d.scopeText),outcomes:splitLines(d.outcomesText)};
    const r=await fetch(sessionEditor.id?`/api/roadmap-sessions/${sessionEditor.id}`:"/api/roadmap-sessions",{method:sessionEditor.id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const saved=await r.json(); setBusy(false); if(!r.ok)return alert(saved.error||"Could not save session");
    setSessions(v=>sessionEditor.id?v.map(x=>x.id===saved.id?saved:x):[...v,saved]); setSessionEditor(null); setExpanded(x=>({...x,[saved.topicId]:true}));
  }
  async function cycleStatus(s:RoadmapSession){
    const next=s.status==="todo"?"active":s.status==="active"?"done":"todo";
    const r=await fetch(`/api/roadmap-sessions/${s.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:next})});
    if(r.ok){const updated=await r.json();setSessions(v=>v.map(x=>x.id===updated.id?updated:x));}
  }
  async function removeTopic(t:RoadmapTopic){
    if(!confirm(`Delete “${t.title}” and all of its roadmap sessions? Questions are not deleted.`))return;
    const r=await fetch(`/api/topics/${t.id}`,{method:"DELETE"}); if(r.ok){setTopics(v=>v.filter(x=>x.id!==t.id));setSessions(v=>v.filter(x=>x.topicId!==t.id));}
  }
  async function removeSession(s:RoadmapSession){
    if(!confirm(`Delete session “${s.title}”?`))return; const r=await fetch(`/api/roadmap-sessions/${s.id}`,{method:"DELETE"}); if(r.ok)setSessions(v=>v.filter(x=>x.id!==s.id));
  }

  return <>
    <div className="roadmap-toolbar card-flat">
      <div><strong>Roadmap editor</strong><div className="muted">Topics are containers. The actual unit of study is a concrete session.</div></div>
      <button className="btn accent" onClick={()=>editTopic()}>+ Add topic</button>
    </div>
    {Object.entries(grouped as Record<string, RoadmapTopic[]>).map(([track,items])=><section className="track" key={track}>
      <div className="track-title"><h2>{track}</h2><div className="track-line"/></div>
      <div className="topic-grid">{items.map((t,i)=>{
        const ss=(sessionsByTopic[t.id]||[]).slice().sort((a,b)=>a.order-b.order);
        const done=ss.filter(x=>x.status==="done").length;
        const isOpen=expanded[t.id] ?? t.slug === "networking-request";
        return <article className={`topic-card ${isOpen?"topic-card-open":""}`} key={t.id}>
          <div className="topic-card-top"><div><div className="topic-order">{String(i+1).padStart(2,"0")} / {t.stage}</div><h3>{t.title}</h3></div><div className="topic-menu"><button className="icon-btn" title="Edit topic" onClick={()=>editTopic(t)}>✎</button><button className="icon-btn danger-text" title="Delete topic" onClick={()=>removeTopic(t)}>×</button></div></div>
          <p>{t.summary}</p>
          <div className="chips">{(t.mustKnow||[]).slice(0,8).map(x=><span className="chip" key={x}>{x}</span>)}</div>
          <div className="topic-progress"><div className="progress-track"><span style={{width:ss.length?`${Math.round(done/ss.length*100)}%`:"0%"}}/></div><span>{done}/{ss.length} sessions</span></div>
          <div className="topic-actions"><button className="btn small secondary" onClick={()=>setExpanded(x=>({...x,[t.id]:!isOpen}))}>{isOpen?"Hide sessions":"Show sessions"}</button><button className="btn small ghost" onClick={()=>editSession(t.id)}>+ Session</button><Link className="btn small ghost" href={`/questions?topic=${encodeURIComponent(t.slug)}`}>Questions</Link></div>
          {isOpen&&<div className="session-list">{ss.length===0?<div className="empty compact">No sessions yet.</div>:ss.map((s,idx)=><div className={`session-row status-${s.status}`} key={s.id}>
            <button className="session-status" onClick={()=>cycleStatus(s)} title="Cycle todo → active → done"><span>{s.status==="done"?"✓":s.status==="active"?"▶":"○"}</span></button>
            <div className="session-main"><div className="session-kicker">SESSION {idx+1} · ~{s.estimatedMinutes} MIN</div><strong>{s.title}</strong><p>{s.objective}</p><div className="session-scope">{(s.scope||[]).slice(0,4).map(x=><span key={x}>{x}</span>)}</div></div>
            <div className="session-actions"><Link className="btn small accent" href={`/prompts?topic=${encodeURIComponent(t.slug)}&session=${encodeURIComponent(s.slug)}`}>Start chat →</Link><button className="icon-btn" onClick={()=>editSession(t.id,s)}>✎</button><button className="icon-btn danger-text" onClick={()=>removeSession(s)}>×</button></div>
          </div>)}</div>}
        </article>})}</div>
    </section>)}

    {topicEditor&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setTopicEditor(null)}><form className="modal card" onSubmit={saveTopic} onMouseDown={e=>e.stopPropagation()}>
      <div className="section-head"><div><div className="eyebrow">Roadmap topic</div><h2>{topicEditor.id?"Edit topic":"Add topic"}</h2></div><button type="button" className="icon-btn" onClick={()=>setTopicEditor(null)}>×</button></div>
      <div className="form-grid"><Field label="Title"><input required className="input" value={topicEditor.draft.title} onChange={e=>setTopicEditor(x=>x&&({...x,draft:{...x.draft,title:e.target.value}}))}/></Field><Field label="Slug"><input required className="input" value={topicEditor.draft.slug} onChange={e=>setTopicEditor(x=>x&&({...x,draft:{...x.draft,slug:e.target.value}}))}/></Field><Field label="Track"><input required className="input" value={topicEditor.draft.track} onChange={e=>setTopicEditor(x=>x&&({...x,draft:{...x.draft,track:e.target.value}}))}/></Field><Field label="Order"><input type="number" className="input" value={topicEditor.draft.order} onChange={e=>setTopicEditor(x=>x&&({...x,draft:{...x.draft,order:Number(e.target.value)}}))}/></Field><Field label="Stage"><select className="select" value={topicEditor.draft.stage} onChange={e=>setTopicEditor(x=>x&&({...x,draft:{...x.draft,stage:e.target.value}}))}><option>foundation</option><option>core</option><option>advanced</option></select></Field></div>
      <Field label="Summary"><textarea className="textarea" value={topicEditor.draft.summary} onChange={e=>setTopicEditor(x=>x&&({...x,draft:{...x.draft,summary:e.target.value}}))}/></Field>
      <Field label="Must know — comma or line separated"><textarea className="textarea small-area" value={topicEditor.draft.mustKnowText} onChange={e=>setTopicEditor(x=>x&&({...x,draft:{...x.draft,mustKnowText:e.target.value}}))}/></Field>
      <div className="actions end"><button type="button" className="btn secondary" onClick={()=>setTopicEditor(null)}>Cancel</button><button disabled={busy} className="btn accent">{busy?"Saving…":"Save topic"}</button></div>
    </form></div>}

    {sessionEditor&&<div className="modal-backdrop" onMouseDown={()=>!busy&&setSessionEditor(null)}><form className="modal card wide-modal" onSubmit={saveSession} onMouseDown={e=>e.stopPropagation()}>
      <div className="section-head"><div><div className="eyebrow">Concrete study unit</div><h2>{sessionEditor.id?"Edit session":"Add session"}</h2></div><button type="button" className="icon-btn" onClick={()=>setSessionEditor(null)}>×</button></div>
      <div className="form-grid"><Field label="Session title"><input required className="input" value={sessionEditor.draft.title} onChange={e=>setSessionEditor(x=>x&&({...x,draft:{...x.draft,title:e.target.value}}))}/></Field><Field label="Slug"><input required className="input" value={sessionEditor.draft.slug} onChange={e=>setSessionEditor(x=>x&&({...x,draft:{...x.draft,slug:e.target.value}}))}/></Field><Field label="Order"><input type="number" className="input" value={sessionEditor.draft.order} onChange={e=>setSessionEditor(x=>x&&({...x,draft:{...x.draft,order:Number(e.target.value)}}))}/></Field><Field label="Minutes"><input type="number" className="input" value={sessionEditor.draft.estimatedMinutes} onChange={e=>setSessionEditor(x=>x&&({...x,draft:{...x.draft,estimatedMinutes:Number(e.target.value)}}))}/></Field></div>
      <Field label="Objective"><textarea className="textarea small-area" value={sessionEditor.draft.objective} onChange={e=>setSessionEditor(x=>x&&({...x,draft:{...x.draft,objective:e.target.value}}))}/></Field>
      <div className="form-grid"><Field label="In scope — one per line"><textarea className="textarea" value={sessionEditor.draft.scopeText} onChange={e=>setSessionEditor(x=>x&&({...x,draft:{...x.draft,scopeText:e.target.value}}))}/></Field><Field label="Exit criteria — one per line"><textarea className="textarea" value={sessionEditor.draft.outcomesText} onChange={e=>setSessionEditor(x=>x&&({...x,draft:{...x.draft,outcomesText:e.target.value}}))}/></Field></div>
      <div className="actions end"><button type="button" className="btn secondary" onClick={()=>setSessionEditor(null)}>Cancel</button><button disabled={busy} className="btn accent">{busy?"Saving…":"Save session"}</button></div>
    </form></div>}
  </>;
}

function Field({label,children}:{label:string;children:ReactNode}){return <div className="field"><label>{label}</label>{children}</div>}
