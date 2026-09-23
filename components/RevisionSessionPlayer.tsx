"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/components/QuestionCard";

type SessionItem = { id:string; position:number; origin:string; status:string; question:Question };
type SessionData = { session:{id:string;name:string;sourceSessionSlugs:string[];targetQuestionCount:number;status:string}; items:SessionItem[] };
type Recommendation = { question:Question; score:number; reasons:string[] };

export default function RevisionSessionPlayer({ id }:{ id:string }) {
  const [data,setData]=useState<SessionData|null>(null);
  const [index,setIndex]=useState(0);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState<Set<number>>(new Set());
  const [revealed,setRevealed]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [result,setResult]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [recommendations,setRecommendations]=useState<Recommendation[]>([]);
  const [weakConcepts,setWeakConcepts]=useState<string[]>([]);
  const [followupBusy,setFollowupBusy]=useState(false);
  const startedAt=useRef(Date.now());

  async function load(){setLoading(true);const r=await fetch(`/api/revision-sessions/${id}`);const out=await r.json();if(r.ok){setData(out);const firstPending=out.items.findIndex((x:SessionItem)=>x.status!=="done");setIndex(firstPending<0?out.items.length:firstPending)}setLoading(false)}
  useEffect(()=>{load()},[id]);
  useEffect(()=>{startedAt.current=Date.now();setSelected(new Set());setRevealed(false);setSubmitted(false);setResult(null)},[index]);

  const completed=useMemo(()=>data?.items.filter((x)=>x.status==="done").length||0,[data]);
  const current=data?.items[index];

  async function recordOpen(selfSignal:"missed"|"partial"|"knew"){
    if(!current||busy)return;setBusy(true);const r=await fetch("/api/revision/attempt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({revisionSessionId:id,questionId:current.question.id,selfSignal,responseMs:Date.now()-startedAt.current})});const out=await r.json();setBusy(false);if(!r.ok)return alert(out.error||"Could not record feedback");finishCurrent(out)}
  async function submitMulti(){if(!current||busy)return;setBusy(true);const r=await fetch("/api/revision/attempt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({revisionSessionId:id,questionId:current.question.id,selectedOptionIndexes:Array.from(selected),responseMs:Date.now()-startedAt.current})});const out=await r.json();setBusy(false);if(!r.ok)return alert(out.error||"Could not record answer");setSubmitted(true);setResult(out)}
  function finishCurrent(out?:any){setData((d)=>d?{...d,items:d.items.map((x,i)=>i===index?{...x,status:"done",question:out?.question||x.question}:x)}:d);setIndex((i)=>i+1)}
  async function finishMulti(){if(!submitted)return;finishCurrent(result)}

  async function loadRecommendations(){const r=await fetch(`/api/revision/recommendations?revisionSessionId=${id}&limit=12`);const out=await r.json();if(r.ok){setRecommendations(out.recommendations||[]);setWeakConcepts(out.graph?.weakConcepts||[])}}
  useEffect(()=>{if(data&&index>=data.items.length){fetch(`/api/revision-sessions/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"completed"})}).catch(()=>{});loadRecommendations()}},[data,index,id]);

  async function createFollowup(){if(!recommendations.length||followupBusy)return;setFollowupBusy(true);const r=await fetch("/api/revision-sessions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:`Follow-up · ${data?.session.name||"revision"}`,questionIds:recommendations.map((x)=>x.question.id),sourceSessionSlugs:data?.session.sourceSessionSlugs||[],targetQuestionCount:Math.min(30,recommendations.length)})});const out=await r.json();setFollowupBusy(false);if(!r.ok)return alert(out.error||"Could not create follow-up");window.location.href=`/review/session/${out.id}`}

  if(loading)return <div className="empty">Loading revision session…</div>;
  if(!data)return <div className="empty">Revision session not found.</div>;
  if(index>=data.items.length)return <div className="revision-finish">
    <div className="card revision-finish-hero"><div className="eyebrow">Revision complete</div><h1>{data.session.name}</h1><p className="lede">The next suggestions are not simply “questions you got wrong”. Recall Forge propagates weak evidence through concept overlap and explicit prerequisite/related-question links, then adds under-sampled and due neighbors.</p><div className="revision-summary-row"><span><strong>{completed}</strong> completed</span><span><strong>{weakConcepts.length}</strong> weak-neighbor concepts</span><span><strong>{recommendations.length}</strong> recommended next</span></div></div>
    {weakConcepts.length>0&&<div className="card-flat concept-cluster"><strong>Weak knowledge cluster</strong><div>{weakConcepts.map((x)=><span className="concept-node" key={x}>{x}</span>)}</div></div>}
    <div className="recommendation-list">{recommendations.map((r,i)=><article className="recommendation-card" key={r.question.id}><div className="recommendation-rank">{String(i+1).padStart(2,"0")}</div><div><div className="question-meta"><span className="badge">{r.question.format==="multi_select"?"4-option":"open"}</span><span className="badge">{r.question.sessionSlug}</span><span className="badge accent">graph {r.score.toFixed(1)}</span></div><strong>{r.question.questionMd}</strong><small>{r.reasons.join(" · ")}</small></div></article>)}</div>
    {recommendations.length>0&&<button className="btn accent followup-btn" onClick={createFollowup} disabled={followupBusy}>{followupBusy?"Building…":"Build recommended follow-up →"}</button>}
  </div>;

  if (!current) return <div className="empty">Question not found.</div>;
  const q=current.question; const isMulti=q.format==="multi_select";
  return <div className="revision-player">
    <div className="revision-session-head"><div><div className="eyebrow">Feedback-driven revision</div><h1>{data.session.name}</h1><small>{data.session.sourceSessionSlugs.length} source sessions · {current.origin==="recommended"?"graph recommendation":"source question"}</small></div><div className="revision-progress-ring"><strong>{index+1}</strong><span>/ {data.items.length}</span></div></div>
    <div className="revision-progress-track"><span style={{width:`${Math.round((index/data.items.length)*100)}%`}}/></div>
    <article className={`revision-card ${isMulti?"multi":"open"}`}>
      <div className="question-meta"><span className="badge level">L{q.difficulty}</span><span className="badge">{q.type}</span><span className="badge accent">{isMulti?"0–4 correct":"open retrieval"}</span><span className="badge session-badge">{q.sessionSlug}</span></div>
      <div className="revision-question">{q.questionMd}</div>
      {isMulti?<>
        <div className="revision-options">{(q.options||[]).map((option,i)=>{const chosen=selected.has(i);const correct=(q.correctOptionIndexes||[]).includes(i);const state=submitted?(correct?"correct":chosen?"wrong":"neutral"):chosen?"chosen":"";return <button key={i} disabled={submitted} className={`revision-option ${state}`} onClick={()=>setSelected((cur)=>{const next=new Set(cur);next.has(i)?next.delete(i):next.add(i);return next})}><span>{String.fromCharCode(65+i)}</span><strong>{option}</strong>{submitted&&<b>{correct?"✓":chosen?"×":""}</b>}</button>})}</div>
        {!submitted?<div className="revision-submit-row"><span className="muted">Select any number of answers — including none.</span><button className="btn accent" onClick={submitMulti} disabled={busy}>{busy?"Checking…":"Submit choices"}</button></div>:<div className="revision-multi-feedback"><div className="answer-title">{result?.scorePermille===1000?"Exact ✓":`Partial · ${Math.round((result?.scorePermille||0)/10)}% option decisions correct`}</div><div className="answer-body">{q.answerMd}</div>{(q.optionFeedback||[]).map((fb,i)=><div className="option-rationale" key={i}><b>{String.fromCharCode(65+i)}</b><span>{fb.rationale}</span><small>{(fb.concepts||[]).join(" · ")}</small></div>)}<button className="btn accent" onClick={finishMulti}>Next question →</button></div>}
      </>:<>
        {!revealed?<div className="revision-open-actions"><span className="muted">Answer aloud or mentally first. Reveal timing is stored as context, but correctness comes from your fast self-signal.</span><button className="btn accent reveal-btn" onClick={()=>setRevealed(true)}>Reveal answer ↓</button></div>:<div className="revision-open-answer"><div className="answer-title">Expected answer</div><div className="answer-body">{q.answerMd}</div>{!!q.keyPoints?.length&&<ul className="keypoints">{q.keyPoints.map((x,i)=><li key={i}>{x}</li>)}</ul>}<div className="implicit-feedback"><span>One tap = feedback + scheduling + graph evidence</span><button disabled={busy} onClick={()=>recordOpen("missed")} className="feedback-missed">Missed</button><button disabled={busy} onClick={()=>recordOpen("partial")} className="feedback-partial">Partial</button><button disabled={busy} onClick={()=>recordOpen("knew")} className="feedback-knew">Knew it</button></div></div>}
      </>}
    </article>
  </div>;
}
