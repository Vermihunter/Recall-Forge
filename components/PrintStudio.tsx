"use client";
import { useMemo,useState } from "react";
import type {Question} from "@/components/QuestionCard";

type Layout={id:string;name:string;cols:number;rows:number;desc:string};
const layouts:Layout[]=[
  {id:"focus-4",name:"Focus 4",cols:2,rows:2,desc:"Large cards for dense explanations"},
  {id:"study-6",name:"Study 6",cols:2,rows:3,desc:"Comfortable general-purpose layout"},
  {id:"compact-9",name:"Compact 9",cols:3,rows:3,desc:"Balanced printable revision cards"},
  {id:"dense-12",name:"Dense 12",cols:3,rows:4,desc:"Save paper for shorter Q&A"},
];
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));
function mirror(i:number,cols:number,rows:number,edge:"long"|"short"){const r=Math.floor(i/cols),c=i%cols;return edge==="long"?r*cols+(cols-1-c):(rows-1-r)*cols+c}
function chunks<T>(xs:T[],n:number){const out:T[][]=[];for(let i=0;i<xs.length;i+=n)out.push(xs.slice(i,i+n));return out}

export default function PrintStudio({questions}:{questions:Question[]}){
  const topics=useMemo(()=>Array.from(new Set(questions.map(q=>q.topicSlug))).sort(),[questions]);
  const [topic,setTopic]=useState("");const[paper,setPaper]=useState<"A4"|"A3">("A4");const[layoutId,setLayoutId]=useState("compact-9");const[edge,setEdge]=useState<"long"|"short">("long");const[cutGuides,setCutGuides]=useState(true);const[showMeta,setShowMeta]=useState(true);const[onlyDue,setOnlyDue]=useState(false);
  const layout=layouts.find(x=>x.id===layoutId)!;const now=Date.now();
  const filtered=useMemo(()=>questions.filter(q=>(!topic||q.topicSlug===topic)&&(!onlyDue||new Date(q.nextReviewAt||0).getTime()<=now)),[questions,topic,onlyDue,now]);
  const pages=useMemo(()=>chunks(filtered,layout.cols*layout.rows),[filtered,layout]);
  function print(){window.print()}
  function standaloneHtml(){
    const size=paper==="A4"?"210mm 297mm":"297mm 420mm";const cap=layout.cols*layout.rows;
    const card=(q:Question|undefined,side:"front"|"back")=>!q?`<div class="cell empty"></div>`:`<article class="cell ${cutGuides?"cuts":""}"><div class="meta">${showMeta?`L${q.difficulty} · ${esc(q.type)} · ${esc(q.topicSlug)}${q.sessionSlug?` · ${esc(q.sessionSlug)}`:""}`:""}</div><div class="kind">${side==="front"?"QUESTION":"ANSWER"}</div><div class="body">${esc(side==="front"?q.questionMd:q.answerMd).replace(/\n/g,"<br>")}</div>${side==="back"&&q.keyPoints?.length?`<ul>${q.keyPoints.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</article>`;
    const sheets=chunks(filtered,cap).flatMap(group=>{const front=Array.from({length:cap},(_,i)=>card(group[i],"front")).join("");const back=Array.from({length:cap},(_,i)=>card(group[mirror(i,layout.cols,layout.rows,edge)],"back")).join("");return [`<section class="sheet">${front}</section>`,`<section class="sheet">${back}</section>`]});
    return `<!doctype html><html><head><meta charset="utf-8"><title>Recall Forge cards</title><style>@page{size:${paper} portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:white;color:#171717;font-family:Arial,sans-serif}.sheet{width:${paper==="A4"?"210mm":"297mm"};height:${paper==="A4"?"297mm":"420mm"};padding:8mm;display:grid;grid-template-columns:repeat(${layout.cols},1fr);grid-template-rows:repeat(${layout.rows},1fr);gap:0;page-break-after:always}.cell{position:relative;border:1px solid #bbb;padding:5mm;overflow:hidden;display:flex;flex-direction:column}.cell.cuts:before,.cell.cuts:after{content:"";position:absolute;background:#888}.meta{font-size:7pt;text-transform:uppercase;letter-spacing:.05em;color:#666}.kind{font:700 7pt monospace;margin-top:4mm}.body{font:12pt/1.28 Georgia,serif;margin:auto 0}.cell ul{font-size:8.5pt;line-height:1.25;padding-left:4mm;margin:3mm 0 0}.empty{border-color:transparent}@media screen{body{background:#ddd}.sheet{margin:12mm auto;background:white;box-shadow:0 2mm 8mm #999}}@media print{.sheet{margin:0;box-shadow:none}}</style></head><body>${sheets.join("")}</body></html>`;
  }
  function downloadHtml(){const blob=new Blob([standaloneHtml()],{type:"text/html;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`recall-forge-${paper.toLowerCase()}-${layout.id}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  return <div className="print-studio">
    <div className="print-controls card"><div className="print-control-grid"><div className="field"><label>Questions</label><select className="select" value={topic} onChange={e=>setTopic(e.target.value)}><option value="">All topics ({questions.length})</option>{topics.map(x=><option value={x} key={x}>{x}</option>)}</select></div><div className="field"><label>Paper</label><select className="select" value={paper} onChange={e=>setPaper(e.target.value as any)}><option>A4</option><option>A3</option></select></div><div className="field"><label>Layout</label><select className="select" value={layoutId} onChange={e=>setLayoutId(e.target.value)}>{layouts.map(x=><option value={x.id} key={x.id}>{x.name} — {x.desc}</option>)}</select></div><div className="field"><label>Duplex flip</label><select className="select" value={edge} onChange={e=>setEdge(e.target.value as any)}><option value="long">Long edge</option><option value="short">Short edge</option></select></div></div><div className="print-options"><label><input type="checkbox" checked={cutGuides} onChange={e=>setCutGuides(e.target.checked)}/> cut borders</label><label><input type="checkbox" checked={showMeta} onChange={e=>setShowMeta(e.target.checked)}/> metadata</label><label><input type="checkbox" checked={onlyDue} onChange={e=>setOnlyDue(e.target.checked)}/> due only</label><span className="muted">{filtered.length} cards · {pages.length*2} printed pages</span></div><div className="print-help">Pages alternate FRONT/BACK. The back grid is mirrored for the selected duplex edge so each answer lands behind its question. In the browser print dialog enable two-sided printing with the same edge, or choose “Save to PDF”.</div><div className="actions"><button className="btn accent" onClick={print}>Print / Save PDF</button><button className="btn secondary" onClick={downloadHtml}>Download standalone HTML</button></div></div>
    <style>{`@media print{@page{size:${paper} portrait;margin:0}}`}</style>
    {filtered.length===0?<div className="empty">No questions match this print selection.</div>:<div className="print-preview">{pages.flatMap((group,pageIndex)=>{
      const cap=layout.cols*layout.rows;const base={gridTemplateColumns:`repeat(${layout.cols},1fr)`,gridTemplateRows:`repeat(${layout.rows},1fr)`};
      return [<section className={`print-sheet paper-${paper.toLowerCase()}`} style={base} key={`f-${pageIndex}`}><SheetLabel side="FRONT" page={pageIndex+1}/>{Array.from({length:cap},(_,i)=><Card key={i} q={group[i]} side="front" cuts={cutGuides} meta={showMeta}/>)}</section>,<section className={`print-sheet paper-${paper.toLowerCase()}`} style={base} key={`b-${pageIndex}`}><SheetLabel side="BACK" page={pageIndex+1}/>{Array.from({length:cap},(_,i)=><Card key={i} q={group[mirror(i,layout.cols,layout.rows,edge)]} side="back" cuts={cutGuides} meta={showMeta}/>)}</section>]
    })}</div>}
  </div>
}
function SheetLabel({side,page}:{side:string;page:number}){return <div className="sheet-label">{side} · SHEET {page}</div>}
function Card({q,side,cuts,meta}:{q?:Question;side:"front"|"back";cuts:boolean;meta:boolean}){if(!q)return <div className="print-card empty-card"/>;return <article className={`print-card ${cuts?"cuts":""}`}><div className="print-card-meta">{meta?<>L{q.difficulty} · {q.type} · {q.topicSlug}{q.sessionSlug?` · ${q.sessionSlug}`:""}</>:null}</div><div className="print-card-kind">{side==="front"?"QUESTION":"ANSWER"}</div><div className="print-card-body">{side==="front"?q.questionMd:q.answerMd}</div>{side==="back"&&!!q.keyPoints?.length&&<ul className="print-keypoints">{q.keyPoints.map((x,i)=><li key={i}>{x}</li>)}</ul>}</article>}
