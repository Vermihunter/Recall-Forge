"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RoadmapSession, RoadmapTopic } from "@/components/RoadmapManager";
import { deepObjective } from "@/lib/sessionDepth";

const dateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
};

export default function DailyPlanner({ initialTopics, initialSessions }: { initialTopics: RoadmapTopic[]; initialSessions: RoadmapSession[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [planDate, setPlanDate] = useState(dateKey());
  const [targetMinutes, setTargetMinutes] = useState(120);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const topicById = useMemo(() => new Map(initialTopics.map((t) => [t.id, t])), [initialTopics]);
  const topicOrder = useMemo(() => new Map(initialTopics.map((t) => [t.id, t.order])), [initialTopics]);
  const planned = useMemo(
    () => sessions.filter((s) => s.plannedFor === planDate).slice().sort((a, b) => (a.planOrder || 0) - (b.planOrder || 0) || a.order - b.order),
    [sessions, planDate],
  );
  const totalMinutes = planned.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);
  const doneCount = planned.filter((s) => s.status === "done").length;
  const plannedTopicCount = new Set(planned.map((s) => s.topicId)).size;

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions
      .filter((s) => s.status !== "done" && s.plannedFor !== planDate)
      .filter((s) => !topicFilter || s.topicId === topicFilter)
      .filter((s) => {
        if (!q) return true;
        const topic = topicById.get(s.topicId);
        return [s.title, s.slug, s.objective, ...(s.scope || []), ...(s.outcomes || []), topic?.title || "", topic?.slug || ""]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (b.status === "active" && a.status !== "active") return 1;
        return (topicOrder.get(a.topicId) || 0) - (topicOrder.get(b.topicId) || 0) || a.order - b.order;
      });
  }, [sessions, planDate, topicFilter, search, topicById, topicOrder]);

  async function patchSession(id: string, patch: Partial<RoadmapSession>) {
    const r = await fetch(`/api/roadmap-sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const updated = await r.json();
    if (!r.ok) throw new Error(updated.error || "Could not update session");
    setSessions((rows) => rows.map((s) => (s.id === updated.id ? updated : s)));
    return updated as RoadmapSession;
  }

  async function addToPlan(session: RoadmapSession) {
    const nextOrder = planned.length ? Math.max(...planned.map((s) => s.planOrder || 0)) + 10 : 10;
    await patchSession(session.id, { plannedFor: planDate, planOrder: nextOrder });
  }

  async function removeFromPlan(session: RoadmapSession) {
    await patchSession(session.id, { plannedFor: null, planOrder: 0 });
  }

  async function move(session: RoadmapSession, direction: -1 | 1) {
    const index = planned.findIndex((s) => s.id === session.id);
    const other = planned[index + direction];
    if (!other) return;
    setBusy(true);
    try {
      const firstOrder = session.planOrder || (index + 1) * 10;
      const secondOrder = other.planOrder || (index + direction + 1) * 10;
      await patchSession(session.id, { planOrder: secondOrder });
      await patchSession(other.id, { planOrder: firstOrder });
    } finally {
      setBusy(false);
    }
  }

  async function markDone(session: RoadmapSession) {
    await patchSession(session.id, { status: session.status === "done" ? "todo" : "done" });
  }

  async function fillToTarget() {
    if (totalMinutes >= targetMinutes) return;
    const candidates = available.filter((s) => !s.plannedFor);
    if (!candidates.length) return;
    setBusy(true);
    try {
      let minutes = totalMinutes;
      let nextOrder = planned.length ? Math.max(...planned.map((s) => s.planOrder || 0)) + 10 : 10;
      for (const session of candidates) {
        await patchSession(session.id, { plannedFor: planDate, planOrder: nextOrder });
        nextOrder += 10;
        minutes += session.estimatedMinutes || 0;
        if (minutes >= targetMinutes) break;
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not build plan");
    } finally {
      setBusy(false);
    }
  }

  async function clearPlan() {
    if (!planned.length || !confirm(`Clear all ${planned.length} sessions planned for ${planDate}?`)) return;
    setBusy(true);
    try {
      for (const session of planned) await patchSession(session.id, { plannedFor: null, planOrder: 0 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="daily-plan-layout">
      <section className="card daily-plan-main">
        <div className="section-head daily-plan-head">
          <div>
            <div className="eyebrow">Daily study plan</div>
            <h1 className="daily-plan-title">Decide the work before you start.</h1>
            <p className="muted">Pick exact sessions for the day, then work them in order. The plan is stored in PostgreSQL and follows you between desktop and mobile.</p>
          </div>
          <div className="daily-plan-date-block">
            <label>Date</label>
            <input className="input" type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
          </div>
        </div>

        <div className="daily-plan-summary">
          <div><span className="stat-label">Planned</span><strong>{planned.length}</strong><small>sessions</small></div>
          <div><span className="stat-label">Time</span><strong>{formatMinutes(totalMinutes)}</strong><small>scheduled</small></div>
          <div><span className="stat-label">Topics</span><strong>{plannedTopicCount}</strong><small>covered</small></div>
          <div><span className="stat-label">Done</span><strong>{doneCount}/{planned.length || 0}</strong><small>today</small></div>
        </div>

        <div className="daily-plan-target card-flat">
          <div>
            <strong>Target study time</strong>
            <div className="muted">Auto-fill takes the next unfinished sessions in roadmap order and never steals sessions already planned for another day.</div>
          </div>
          <div className="daily-plan-target-controls">
            <input className="input minutes-input" type="number" min={20} step={15} value={targetMinutes} onChange={(e) => setTargetMinutes(Math.max(20, Number(e.target.value) || 20))} />
            <span className="muted">minutes</span>
            <button className="btn accent" disabled={busy || totalMinutes >= targetMinutes} onClick={fillToTarget}>Fill to target</button>
            <button className="btn secondary" disabled={busy || !planned.length} onClick={clearPlan}>Clear day</button>
          </div>
        </div>

        {planned.length === 0 ? (
          <div className="empty daily-plan-empty">Nothing planned for this date yet. Add sessions below or let Recall Forge fill the day to your target.</div>
        ) : (
          <div className="daily-plan-list">
            {planned.map((s, index) => {
              const topic = topicById.get(s.topicId);
              return <article className={`daily-plan-item status-${s.status}`} key={s.id}>
                <div className="daily-plan-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="daily-plan-copy">
                  <div className="daily-plan-topic">{topic?.title || "Unknown topic"} · ~{s.estimatedMinutes} min</div>
                  <strong>{s.title}</strong>
                  <p>{deepObjective({ title: s.title, objective: s.objective, scope: s.scope, outcomes: s.outcomes, track: topic?.track })}</p>
                  <div className="session-scope">{(s.scope || []).slice(0, 5).map((x) => <span key={x}>{x}</span>)}</div>
                </div>
                <div className="daily-plan-actions">
                  <Link className="btn small accent" href={`/prompts?topic=${encodeURIComponent(topic?.slug || "")}&session=${encodeURIComponent(s.slug)}`}>Start →</Link>
                  <button className="btn small secondary" onClick={() => markDone(s)}>{s.status === "done" ? "Undo done" : "Done"}</button>
                  <div className="daily-plan-order-buttons">
                    <button className="icon-btn" disabled={busy || index === 0} onClick={() => move(s, -1)} title="Move earlier">↑</button>
                    <button className="icon-btn" disabled={busy || index === planned.length - 1} onClick={() => move(s, 1)} title="Move later">↓</button>
                    <button className="icon-btn danger-text" disabled={busy} onClick={() => removeFromPlan(s)} title="Remove from this day">×</button>
                  </div>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>

      <aside className="card daily-picker">
        <div className="eyebrow">Add study material</div>
        <h2>Choose exact sessions</h2>
        <p className="muted">Search by topic, session, scope or outcome. Completed sessions are hidden.</p>
        <div className="field"><label>Search</label><input className="input" placeholder="DHCP, page faults, TCP..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="field"><label>Topic</label><select className="select" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}><option value="">All topics</option>{initialTopics.slice().sort((a,b)=>a.order-b.order).map((t)=><option value={t.id} key={t.id}>{t.title}</option>)}</select></div>
        <div className="daily-picker-results">
          {available.slice(0, 40).map((s) => {
            const topic = topicById.get(s.topicId);
            return <div className="daily-picker-row" key={s.id}>
              <div><span>{topic?.title}</span><strong>{s.title}</strong><small>~{s.estimatedMinutes} min{s.plannedFor ? ` · planned ${s.plannedFor}` : ""}</small></div>
              <button className="btn small secondary" disabled={busy || !!s.plannedFor} onClick={() => addToPlan(s)}>{s.plannedFor ? "Planned" : "+ Add"}</button>
            </div>;
          })}
          {available.length === 0 && <div className="empty compact">No unfinished sessions match.</div>}
        </div>
      </aside>
    </div>
  );
}
