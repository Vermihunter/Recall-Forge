"use client";
import { useState } from "react";

export type Question = {
  id:string; externalId?:string|null; topicSlug:string; sessionSlug?:string|null; type:string; difficulty:number;
  questionMd:string; answerMd:string; keyPoints?:string[]; hints?:{level:number;text:string}[]; commonMistakes?:string[];
  expectedMinutes?:number; tags?:string[]; nextReviewAt?:string|Date; repetitions?:number; intervalDays?:number;
};

export default function QuestionCard({q,onReviewed,showReview=true}:{q:Question;onReviewed?:(q:Question)=>void;showReview?:boolean}){
  const [open,setOpen]=useState(false); const [hintCount,setHintCount]=useState(0); const [busy,setBusy]=useState(false);
  async function grade(value:"again"|"hard"|"good"|"easy") {setBusy(true);const r=await fetch(`/api/questions/${q.id}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({grade:value})});const updated=await r.json();setBusy(false);if(r.ok){setOpen(false);setHintCount(0);onReviewed?.(updated)}}
  const hints=q.hints||[];
  return <article className="question-card">
    <div className="question-head">
      <div className="question-meta"><span className="badge level">L{q.difficulty}</span><span className="badge">{q.type}</span><span className="badge accent">{q.topicSlug}</span>{q.sessionSlug&&<span className="badge session-badge">{q.sessionSlug}</span>}{q.expectedMinutes?<span className="badge">~{q.expectedMinutes} min</span>:null}</div>
      <div className="question-text">{q.questionMd}</div>
      <div className="actions review-actions">{hints.length>0&&hintCount<hints.length&&<button className="btn small ghost" onClick={()=>setHintCount(c=>c+1)}>Hint {hintCount+1}</button>}<button className="btn small secondary reveal-btn" onClick={()=>setOpen(v=>!v)}>{open?"Hide answer ↑":"Show answer ↓"}</button></div>
      {hintCount>0&&<div className="card-flat hint-box">{hints.slice(0,hintCount).map((h,i)=><div key={i}><span className="mono muted">H{i+1}</span> {h.text}</div>)}</div>}
    </div>
    {open&&<div className="answer"><div className="answer-title">Expected answer</div><div className="answer-body">{q.answerMd}</div>{!!q.keyPoints?.length&&<><div className="answer-title answer-subtitle">Full-credit points</div><ul className="keypoints">{q.keyPoints.map((x,i)=><li key={i}>{x}</li>)}</ul></>}{!!q.commonMistakes?.length&&<><div className="answer-title answer-subtitle">Common traps</div><ul className="keypoints">{q.commonMistakes.map((x,i)=><li key={i}>{x}</li>)}</ul></>}</div>}
    {showReview&&open&&<div className="review-bar"><span className="muted review-prompt">Grade what you knew <strong>before</strong> reveal.</span><div className="grade-buttons"><button disabled={busy} className="grade-button again" onClick={()=>grade("again")}><strong>Again</strong><small>10m</small></button><button disabled={busy} className="grade-button hard" onClick={()=>grade("hard")}><strong>Hard</strong><small>short</small></button><button disabled={busy} className="grade-button good" onClick={()=>grade("good")}><strong>Good</strong><small>normal</small></button><button disabled={busy} className="grade-button easy" onClick={()=>grade("easy")}><strong>Easy</strong><small>long</small></button></div></div>}
  </article>
}
