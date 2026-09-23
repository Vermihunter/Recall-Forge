"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Question } from "@/components/QuestionCard";

type Layout = { id: string; name: string; cols: number; rows: number; desc: string };
type PrintableItem =
  | { kind: "topic-cover"; topicSlug: string; tone: TopicTone }
  | { kind: "question"; question: Question; tone: TopicTone };
type PrintMode = "qa" | "questions";
type PrintStateFilter = "unprinted" | "all" | "printed";
type CardFont = "serif" | "sans" | "mono";
type CardTextAlign = "left" | "center";
type CardVerticalAlign = "top" | "center";
type CardDensity = "auto" | "compact" | "comfortable";
type CardFormat = {
  font: CardFont;
  align: CardTextAlign;
  vertical: CardVerticalAlign;
  density: CardDensity;
};
type CardFace = { item: PrintableItem; face: "question" | "answer" };
type PhysicalCard = { front?: CardFace; back?: CardFace };
type SheetPlan = { front: Array<CardFace | undefined>; back: Array<CardFace | undefined> };
export type PrintSession = { slug: string; title: string; topicSlug: string; order: number };

type TopicTone = {
  border: string;
  fill: string;
  soft: string;
  ink: string;
  badge: string;
};

const NO_SESSION = "__no_session__";
const FONT_STACKS: Record<CardFont, string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: 'Inter, Arial, Helvetica, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};
const layouts: Layout[] = [
  { id: "focus-4", name: "Focus 4", cols: 2, rows: 2, desc: "Large cards for dense explanations" },
  { id: "study-6", name: "Study 6", cols: 2, rows: 3, desc: "Comfortable general-purpose layout" },
  { id: "compact-9", name: "Compact 9", cols: 3, rows: 3, desc: "Balanced printable revision cards" },
  { id: "dense-12", name: "Dense 12", cols: 3, rows: 4, desc: "Save paper for shorter Q&A" },
];

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

function mirror(i: number, cols: number, rows: number, edge: "long" | "short") {
  const r = Math.floor(i / cols), c = i % cols;
  return edge === "long" ? r * cols + (cols - 1 - c) : (rows - 1 - r) * cols + c;
}

function chunks<T>(xs: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

function hashString(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function topicTone(topic: string): TopicTone {
  const hue = hashString(topic) % 360;
  return {
    border: `hsl(${hue} 68% 38%)`,
    fill: `hsl(${hue} 62% 94%)`,
    soft: `hsl(${hue} 58% 86%)`,
    ink: `hsl(${hue} 54% 23%)`,
    badge: `hsl(${hue} 64% 97%)`,
  };
}

function cssVars(tone: TopicTone): CSSProperties {
  return {
    ["--topic-border" as any]: tone.border,
    ["--topic-fill" as any]: tone.fill,
    ["--topic-soft" as any]: tone.soft,
    ["--topic-ink" as any]: tone.ink,
    ["--topic-badge" as any]: tone.badge,
  };
}

function formatVars(format: CardFormat, layoutId: string): CSSProperties {
  const studySix = layoutId === "study-6";
  const density = format.density === "comfortable" ? "comfortable" : "compact";
  const baseSize = density === "comfortable" ? (studySix ? 11.1 : 10.7) : (studySix ? 9.8 : 9.4);
  const lineHeight = density === "comfortable" ? 1.27 : 1.14;
  const padding = density === "comfortable" ? (studySix ? "4mm" : "3.6mm") : (studySix ? "2.8mm" : "2.5mm");
  const blockGap = density === "comfortable" ? "2.4mm" : "1.25mm";
  return {
    ["--card-font" as any]: FONT_STACKS[format.font],
    ["--card-text-align" as any]: format.align,
    ["--card-items" as any]: format.align === "center" ? "center" : "flex-start",
    ["--card-list-position" as any]: format.align === "center" ? "inside" : "outside",
    ["--card-vertical" as any]: format.vertical === "center" ? "center" : "flex-start",
    ["--card-base-size-pt" as any]: baseSize,
    ["--card-font-size" as any]: `${baseSize}pt`,
    ["--card-line-height" as any]: lineHeight,
    ["--card-padding" as any]: padding,
    ["--card-block-gap" as any]: blockGap,
  };
}

function formatStyleString(format: CardFormat, layoutId: string) {
  return Object.entries(formatVars(format, layoutId) as Record<string, string | number>)
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(";");
}

function useAutoFitCard(enabled: boolean, fitKey: string) {
  const ref = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const baseSize = Number.parseFloat(getComputedStyle(card).getPropertyValue("--card-base-size-pt")) || 9.8;
    card.style.setProperty("--card-font-size", `${baseSize}pt`);
    if (!enabled) return;

    let cancelled = false;
    const fit = () => {
      if (cancelled || !card.isConnected) return;
      let scale = 1;
      const minScale = 0.38;
      const step = 0.035;
      card.style.setProperty("--card-font-size", `${baseSize}pt`);
      while (scale > minScale && (card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1)) {
        scale = Math.max(minScale, scale - step);
        card.style.setProperty("--card-font-size", `${(baseSize * scale).toFixed(2)}pt`);
      }
    };

    const frame = requestAnimationFrame(() => {
      fit();
      requestAnimationFrame(fit);
    });
    const timer = window.setTimeout(fit, 120);
    window.addEventListener("beforeprint", fit);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("beforeprint", fit);
    };
  }, [enabled, fitKey]);
  return ref;
}

function titleFromSlug(slug: string) {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function questionItem(question: Question): PrintableItem {
  return { kind: "question", question, tone: topicTone(question.topicSlug) };
}

function matchesPrintSearch(question: Question, rawQuery: string) {
  const terms = rawQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;

  const tags = (question.tags || []).map((tag) => tag.toLowerCase());
  const topic = question.topicSlug.toLowerCase();
  const session = (question.sessionSlug || "").toLowerCase();
  const type = question.type.toLowerCase();
  const general = [
    question.questionMd,
    question.answerMd,
    question.topicSlug,
    question.sessionSlug || "",
    question.type,
    ...(question.tags || []),
    ...(question.keyPoints || []),
    ...(question.commonMistakes || []),
  ].join("\n").toLowerCase();

  return terms.every((term) => {
    if (term.startsWith("tag:")) return tags.some((tag) => tag.includes(term.slice(4)));
    if (term.startsWith("topic:")) return topic.includes(term.slice(6));
    if (term.startsWith("session:")) return session.includes(term.slice(8));
    if (term.startsWith("type:")) return type.includes(term.slice(5));
    return general.includes(term);
  });
}

function inlineMarkdownToHtml(source: string) {
  return esc(source)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>");
}

function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    parts.push(`<p>${inlineMarkdownToHtml(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length || !listType) return;
    parts.push(`<${listType}>${listItems.join("")}</${listType}>`);
    listItems = [];
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = Math.min(4, heading[1].length);
      parts.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(`<li>${inlineMarkdownToHtml(bullet[1])}</li>`);
      continue;
    }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(`<li>${inlineMarkdownToHtml(ordered[1])}</li>`);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph(); flushList();
  return parts.join("");
}

function MarkdownBlock({ markdown, className }: { markdown: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }} />;
}

export default function PrintStudio({ questions, sessions }: { questions: Question[]; sessions: PrintSession[] }) {
  const [rows, setRows] = useState<Question[]>(questions);
  const [topic, setTopic] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState("");
  const [printState, setPrintState] = useState<PrintStateFilter>("unprinted");
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [coverSelection, setCoverSelection] = useState<Set<string> | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>("qa");
  const [paper, setPaper] = useState<"A4" | "A3">("A4");
  const [layoutId, setLayoutId] = useState("study-6");
  const [edge, setEdge] = useState<"long" | "short">("long");
  const [cutGuides, setCutGuides] = useState(true);
  const [showMeta, setShowMeta] = useState(true);
  const [onlyDue, setOnlyDue] = useState(false);
  const [cardFont, setCardFont] = useState<CardFont>("serif");
  const [cardAlign, setCardAlign] = useState<CardTextAlign>("left");
  const [cardVertical, setCardVertical] = useState<CardVerticalAlign>("center");
  const [cardDensity, setCardDensity] = useState<CardDensity>("auto");
  const [pendingPrintIds, setPendingPrintIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const layout = layouts.find((x) => x.id === layoutId)!;
  const cardFormat = useMemo<CardFormat>(() => ({ font: cardFont, align: cardAlign, vertical: cardVertical, density: cardDensity }), [cardFont, cardAlign, cardVertical, cardDensity]);
  const printFormatStyle = useMemo(() => formatVars(cardFormat, layoutId), [cardFormat, layoutId]);
  const now = Date.now();

  const topics = useMemo(() => Array.from(new Set(rows.map((q) => q.topicSlug))).sort(), [rows]);
  const sessionTitle = useMemo(() => new Map(sessions.map((s) => [s.slug, s.title])), [sessions]);
  const topicSessions = useMemo(
    () => sessions.filter((s) => !topic || s.topicSlug === topic).sort((a, b) => a.order - b.order),
    [sessions, topic],
  );

  const topicQuestions = useMemo(() => rows.filter((q) => !topic || q.topicSlug === topic), [rows, topic]);
  const sessionStats = useMemo(() => {
    if (!topic) return [];
    const refs = topicSessions.map((s) => {
      const qs = topicQuestions.filter((q) => q.sessionSlug === s.slug);
      return { ...s, total: qs.length, unprinted: qs.filter((q) => !q.lastPrintedAt).length };
    });
    const legacy = topicQuestions.filter((q) => !q.sessionSlug);
    if (legacy.length) refs.push({ slug: NO_SESSION, title: "No session assigned", topicSlug: topic, order: 99999, total: legacy.length, unprinted: legacy.filter((q) => !q.lastPrintedAt).length });
    return refs.filter((s) => s.total > 0);
  }, [topic, topicQuestions, topicSessions]);

  const filteredQuestions = useMemo(
    () => rows.filter((q) => {
      if (topic && q.topicSlug !== topic) return false;
      if (topic && selectedSessions !== null) {
        const key = q.sessionSlug || NO_SESSION;
        if (!selectedSessions.has(key)) return false;
      }
      if (onlyDue && new Date(q.nextReviewAt || 0).getTime() > now) return false;
      if (printState === "unprinted" && q.lastPrintedAt) return false;
      if (printState === "printed" && !q.lastPrintedAt) return false;
      return matchesPrintSearch(q, search);
    }),
    [rows, topic, selectedSessions, onlyDue, now, printState, search],
  );

  useEffect(() => {
    setSelection(null);
    setCoverSelection(null);
  }, [topic, selectedSessions, onlyDue, printState, search]);

  const selectedQuestions = useMemo(
    () => selection === null ? filteredQuestions : filteredQuestions.filter((q) => selection.has(q.id)),
    [filteredQuestions, selection],
  );

  const coverCandidateTopics = useMemo(() => {
    if (topic) return [topic];
    return Array.from(new Set(filteredQuestions.map((q) => q.topicSlug))).sort();
  }, [filteredQuestions, topic]);

  const selectedCoverTopics = useMemo(
    () => coverSelection === null ? coverCandidateTopics : coverCandidateTopics.filter((slug) => coverSelection.has(slug)),
    [coverCandidateTopics, coverSelection],
  );

  const selectedIds = useMemo(() => selectedQuestions.map((q) => q.id), [selectedQuestions]);
  const selectedUnprinted = useMemo(() => selectedQuestions.filter((q) => !q.lastPrintedAt).length, [selectedQuestions]);
  const hasPrintableCards = selectedQuestions.length > 0 || selectedCoverTopics.length > 0;

  const printableItems = useMemo(() => {
    const groups = new Map<string, Question[]>();
    for (const q of selectedQuestions) {
      const arr = groups.get(q.topicSlug) || [];
      arr.push(q);
      groups.set(q.topicSlug, arr);
    }
    const topicSlugs = Array.from(new Set([...groups.keys(), ...selectedCoverTopics])).sort();
    const coverSet = new Set(selectedCoverTopics);
    const items: PrintableItem[] = [];
    for (const topicSlug of topicSlugs) {
      const tone = topicTone(topicSlug);
      if (coverSet.has(topicSlug)) items.push({ kind: "topic-cover", topicSlug, tone });
      for (const question of groups.get(topicSlug) || []) items.push({ kind: "question", question, tone });
    }
    return items;
  }, [selectedQuestions, selectedCoverTopics]);

  const physicalCards = useMemo<PhysicalCard[]>(() => {
    if (printMode === "qa") {
      return printableItems.map((item) => ({
        front: { item, face: "question" },
        back: item.kind === "topic-cover" ? undefined : { item, face: "answer" },
      }));
    }

    const groups = new Map<string, Question[]>();
    for (const question of selectedQuestions) {
      const current = groups.get(question.topicSlug) || [];
      current.push(question);
      groups.set(question.topicSlug, current);
    }
    const cards: PhysicalCard[] = [];
    const topicSlugs = Array.from(new Set([...groups.keys(), ...selectedCoverTopics])).sort();
    const coverSet = new Set(selectedCoverTopics);
    for (const topicSlug of topicSlugs) {
      const tone = topicTone(topicSlug);
      if (coverSet.has(topicSlug)) cards.push({ front: { item: { kind: "topic-cover", topicSlug, tone }, face: "question" }, back: undefined });
      const qs = groups.get(topicSlug) || [];
      for (let i = 0; i < qs.length; i += 2) {
        cards.push({
          front: { item: questionItem(qs[i]), face: "question" },
          back: qs[i + 1] ? { item: questionItem(qs[i + 1]), face: "question" } : undefined,
        });
      }
    }
    return cards;
  }, [selectedQuestions, selectedCoverTopics, printMode, printableItems]);

  const sheetPlans = useMemo<SheetPlan[]>(() => {
    const cap = layout.cols * layout.rows;
    return chunks(physicalCards, cap).map((cards) => ({ front: cards.map((card) => card.front), back: cards.map((card) => card.back) }));
  }, [layout, physicalCards]);

  const occupiedSideCount = useMemo(
    () => physicalCards.reduce((count, card) => count + (card.front ? 1 : 0) + (card.back ? 1 : 0), 0),
    [physicalCards],
  );
  const printedPageCount = useMemo(
    () => sheetPlans.reduce((count, sheet) => count + 1 + (sheet.back.some(Boolean) ? 1 : 0), 0),
    [sheetPlans],
  );

  function toggleQuestion(id: string) {
    setSelection((current) => {
      const next = current === null ? new Set(filteredQuestions.map((q) => q.id)) : new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleCover(topicSlug: string) {
    setCoverSelection((current) => {
      const next = current === null ? new Set(coverCandidateTopics) : new Set(current);
      if (next.has(topicSlug)) next.delete(topicSlug); else next.add(topicSlug);
      return next;
    });
  }

  function toggleSession(sessionSlug: string) {
    setSelectedSessions((current) => {
      // Preserve the old single-click behavior: when the scope is "All sessions",
      // clicking one session isolates it. Additional clicks then build a multi-session set.
      if (current === null) return new Set([sessionSlug]);
      const next = new Set(current);
      if (next.has(sessionSlug)) next.delete(sessionSlug); else next.add(sessionSlug);
      return next;
    });
  }

  function sessionQuestionIds(sessionSlug: string) {
    return topicQuestions
      .filter((q) => sessionSlug === NO_SESSION ? !q.sessionSlug : q.sessionSlug === sessionSlug)
      .map((q) => q.id);
  }

  async function setPrintedState(ids: string[], action: "mark" | "unmark") {
    if (!ids.length) return;
    setStatus(action === "mark" ? "Marking questions as printed…" : "Resetting print state…");
    const r = await fetch("/api/questions/print-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    const out = await r.json();
    if (!r.ok) { setStatus(out.error || "Could not update print state."); return; }
    const idSet = new Set(ids);
    const stamp = new Date().toISOString();
    setRows((current) => current.map((q) => {
      if (!idSet.has(q.id)) return q;
      return action === "mark"
        ? { ...q, lastPrintedAt: stamp, printCount: (q.printCount || 0) + 1 }
        : { ...q, lastPrintedAt: null, printCount: 0 };
    }));
    setSelection(null);
    setPendingPrintIds([]);
    setStatus(action === "mark" ? `Marked ${ids.length} question${ids.length === 1 ? "" : "s"} as printed.` : `Reset print state for ${ids.length} question${ids.length === 1 ? "" : "s"}.`);
  }

  function print() {
    if (!hasPrintableCards) return;
    window.print();
    setPendingPrintIds(selectedIds);
  }

  function standaloneHtml() {
    const cap = layout.cols * layout.rows;
    const formatting = formatStyleString(cardFormat, layoutId);
    const sheetStyle = `style="${formatting}"`;
    const sheets = sheetPlans.flatMap((sheet) => {
      const front = Array.from({ length: cap }, (_, i) => {
        const side = sheet.front[i];
        return renderPrintableItemHtml(side?.item, side?.face || "question", cutGuides, showMeta);
      }).join("");
      const pages = [`<section class="sheet" ${sheetStyle}>${front}</section>`];
      if (sheet.back.some(Boolean)) {
        const back = Array.from({ length: cap }, (_, i) => {
          const side = sheet.back[mirror(i, layout.cols, layout.rows, edge)];
          return renderPrintableItemHtml(side?.item, side?.face || "question", cutGuides, showMeta);
        }).join("");
        pages.push(`<section class="sheet" ${sheetStyle}>${back}</section>`);
      }
      return pages;
    });

    return `<!doctype html><html><head><meta charset="utf-8"><title>Recall Forge cards</title><style>
      @page{size:${paper} portrait;margin:0}*{box-sizing:border-box}:root{--ink:#171717;--muted:#6b6257;--line:#c9beb1}
      body{margin:0;background:white;color:var(--ink);font-family:Inter,Arial,sans-serif}.sheet{width:${paper === "A4" ? "210mm" : "297mm"};height:${paper === "A4" ? "297mm" : "420mm"};padding:8mm;display:grid;grid-template-columns:repeat(${layout.cols},1fr);grid-template-rows:repeat(${layout.rows},1fr);gap:0;page-break-after:always}.cell{position:relative;border:1px solid var(--line);padding:var(--card-padding);overflow:hidden;display:flex;flex-direction:column;min-width:0;min-height:0;background:white;font-size:var(--card-font-size);text-align:var(--card-text-align)}.cell.topic-card{background:var(--topic-fill);border:1.5px solid var(--topic-border)}.meta{font:700 5.7pt/1.05 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:6pt}.topic-meta{color:var(--topic-ink)}.flow{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:var(--card-vertical);gap:var(--card-block-gap)}.kind{font:800 .62em/1.05 ui-monospace,monospace;margin:0;color:#51473c;letter-spacing:.04em}.body{font-family:var(--card-font);font-size:1em;line-height:var(--card-line-height);margin:0;color:#201c18;overflow-wrap:anywhere}.body p{margin:.2em 0}.body h1,.body h2,.body h3,.body h4{margin:.28em 0 .12em;line-height:1.06;font-family:var(--card-font)}.body h1{font-size:1.28em}.body h2{font-size:1.18em}.body h3{font-size:1.1em}.body h4{font-size:1.04em}.body ul,.body ol{margin:.22em 0;padding-left:1.05em;list-style-position:var(--card-list-position)}.body li{margin:.06em 0}.body code{font:inherit;font-family:ui-monospace,monospace;background:#f1ece4;padding:.02em .2em;border-radius:2px}.body strong{font-weight:700}.body em{font-style:italic}.topic-cover{display:flex;flex:1;min-height:0;flex-direction:column;justify-content:center;align-items:var(--card-items);text-align:var(--card-text-align);gap:2mm;color:var(--topic-ink)}.topic-cover-label{font:800 .62em/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.topic-cover-title{font:800 1.55em/1.02 var(--card-font);max-width:100%;overflow-wrap:anywhere}.topic-cover-subtitle{font:.88em/1.2 var(--card-font);max-width:100%;color:color-mix(in srgb,var(--topic-ink) 82%,white)}.topic-accent{width:18mm;height:2mm;background:var(--topic-border);border-radius:999px}.topic-chip{margin-top:1mm;align-self:var(--card-items);border:1px solid color-mix(in srgb,var(--topic-border) 55%,white);background:var(--topic-badge);padding:.9mm 1.6mm;border-radius:999px;font:700 .62em/1 ui-monospace,monospace;letter-spacing:.04em}.multi-options{display:grid;gap:.18em;list-style:none;padding:0;margin:.22em 0 0}.multi-options li{display:grid;grid-template-columns:1.6em 1fr;gap:.35em;align-items:start}.multi-options b{font:800 .78em ui-monospace,monospace;border:1px solid var(--line);display:grid;place-items:center;min-height:1.45em}.multi-options span{font-size:.88em;line-height:1.15}.multi-correct{font:800 .7em ui-monospace,monospace;margin-top:.18em;color:#315d47}.keypoints{font-family:var(--card-font);font-size:.72em;line-height:1.12;padding-left:1.05em;margin:.12em 0 0;list-style-position:var(--card-list-position)}.keypoints li{margin:.04em 0}.empty{border-color:transparent;background:transparent}.cell.topic-card{padding:0!important;border:1.25mm solid var(--topic-border)!important;background:white!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cell.topic-card>.meta{display:none}.topic-cover-v2{width:100%;height:100%;display:grid;grid-template-rows:auto 1fr auto;gap:0!important;align-items:stretch!important;text-align:left!important;color:var(--topic-ink);font-family:var(--card-font)}.topic-cover-band{min-height:11mm;padding:2.4mm 3mm;border-bottom:1.15mm solid var(--topic-border);background:var(--topic-border);color:white;display:flex;justify-content:space-between;align-items:center;font:800 .66em/1 ui-monospace,monospace;letter-spacing:.09em}.topic-cover-band strong{font:inherit}.topic-cover-core{padding:4mm 3.6mm;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:2mm;background:linear-gradient(135deg,var(--topic-fill),white 72%)}.topic-cover-kicker{font:800 .62em/1 ui-monospace,monospace;letter-spacing:.12em;color:var(--topic-border)}.topic-cover-v2 .topic-cover-title{font:900 1.85em/.95 var(--card-font);color:var(--topic-ink);letter-spacing:-.03em}.topic-cover-rule{width:100%;height:2.2mm;border-top:.7mm solid var(--topic-border);border-bottom:.25mm solid var(--topic-border);margin:.5mm 0}.topic-cover-rule span{display:none}.topic-cover-v2 .topic-cover-subtitle{font:.82em/1.2 var(--card-font);color:#42382f;max-width:94%}.topic-cover-footer{min-height:8mm;padding:1.7mm 3mm;border-top:.55mm solid var(--topic-border);display:flex;justify-content:space-between;align-items:center;color:var(--topic-border);font:800 .62em/1 ui-monospace,monospace;letter-spacing:.04em}.topic-cover-footer b{font-size:1.55em}.topic-cover-band,.topic-cover-core{-webkit-print-color-adjust:exact;print-color-adjust:exact}@media screen{body{background:#ddd}.sheet{margin:12mm auto;background:white;box-shadow:0 2mm 8mm #999}}@media print{.sheet{margin:0;box-shadow:none}}
    </style></head><body class="${cardDensity === "auto" ? "auto-fit" : ""}">${sheets.join("")}<script>
      function fitRecallForgeCards(){
        document.querySelectorAll('.auto-fit .fit-card').forEach(function(card){
          var styles=getComputedStyle(card);
          var base=parseFloat(styles.getPropertyValue('--card-base-size-pt'))||9.8;
          var scale=1, min=.38, step=.035;
          card.style.setProperty('--card-font-size',base+'pt');
          while(scale>min&&(card.scrollHeight>card.clientHeight+1||card.scrollWidth>card.clientWidth+1)){
            scale=Math.max(min,scale-step);
            card.style.setProperty('--card-font-size',(base*scale).toFixed(2)+'pt');
          }
        });
      }
      window.addEventListener('load',function(){requestAnimationFrame(function(){fitRecallForgeCards();requestAnimationFrame(fitRecallForgeCards);});setTimeout(fitRecallForgeCards,120)});
      window.addEventListener('beforeprint',fitRecallForgeCards);
      if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitRecallForgeCards);
    </script></body></html>`;
  }

  function downloadHtml() {
    if (!hasPrintableCards) return;
    const blob = new Blob([standaloneHtml()], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `recall-forge-${paper.toLowerCase()}-${layout.id}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    setStatus("Standalone HTML downloaded. Print state was not changed.");
  }

  const selectedSessionLabel = useMemo(() => {
    if (!topic) return "";
    if (selectedSessions === null) return "All sessions";
    if (selectedSessions.size === 0) return "No sessions selected";
    if (selectedSessions.size === 1) {
      const slug = Array.from(selectedSessions)[0];
      return slug === NO_SESSION ? "No session assigned" : (sessionTitle.get(slug) || titleFromSlug(slug));
    }
    return `${selectedSessions.size} sessions selected`;
  }, [topic, selectedSessions, sessionTitle]);

  return (
    <div className="print-studio">
      <div className="print-controls card">
        <div className="print-scope-head">
          <div>
            <div className="eyebrow">1 · Scope the print job</div>
            <h2>Choose the exact study slice</h2>
            <p className="section-note">The default queue shows questions that have never been marked as printed. That means a newly imported session automatically appears without bringing your older cards back.</p>
          </div>
          <div className="print-queue-summary"><strong>{selectedQuestions.length + selectedCoverTopics.length}</strong><span>cards selected</span><small>{selectedQuestions.length} questions · {selectedCoverTopics.length} cover{selectedCoverTopics.length === 1 ? "" : "s"} · {selectedUnprinted} new</small></div>
        </div>

        <div className="print-scope-grid">
          <div className="field">
            <label>Topic</label>
            <select className="select" value={topic} onChange={(e) => { setTopic(e.target.value); setSelectedSessions(null); }}>
              <option value="">All topics ({rows.length})</option>
              {topics.map((x) => <option value={x} key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Session scope</label>
            <div className={`print-session-scope-box ${!topic ? "disabled" : ""}`}>
              <strong>{topic ? selectedSessionLabel : "Choose a topic first"}</strong>
              {topic && <small>{selectedSessions === null ? `${sessionStats.length} sessions included` : `${selectedSessions.size} of ${sessionStats.length} sessions included`}</small>}
            </div>
          </div>
          <div className="field">
            <label>Print history</label>
            <select className="select" value={printState} onChange={(e) => setPrintState(e.target.value as PrintStateFilter)}>
              <option value="unprinted">Not printed yet</option>
              <option value="all">All matching questions</option>
              <option value="printed">Already printed</option>
            </select>
          </div>
        </div>

        {topic && sessionStats.length > 0 && (
          <div className="print-session-browser">
            <div className="print-browser-title">
              <div><strong>Sessions in this topic</strong><span className="muted"> · choose one or combine several sessions in a single print job</span></div>
              <div className="actions">
                <button className="btn small ghost" onClick={() => setSelectedSessions(null)}>All sessions</button>
                <button className="btn small ghost" onClick={() => setSelectedSessions(new Set())}>Clear sessions</button>
              </div>
            </div>
            <div className="print-session-grid">
              <button className={`print-session-row print-session-all ${selectedSessions === null ? "active" : ""}`} onClick={() => setSelectedSessions(null)}>
                <span className="print-session-index">ALL</span><span><strong>All sessions</strong><small>{topicQuestions.filter((q) => !q.lastPrintedAt).length} new · {topicQuestions.length} total</small></span>
              </button>
              {sessionStats.map((s, index) => {
                const allPrinted = s.total > 0 && s.unprinted === 0;
                const ids = sessionQuestionIds(s.slug);
                const selected = selectedSessions !== null && selectedSessions.has(s.slug);
                return (
                  <div key={s.slug} className={`print-session-row ${selected ? "active" : ""}`}>
                    <button className="print-session-select" onClick={() => toggleSession(s.slug)}>
                      <span className={`print-session-check ${selected ? "checked" : ""}`}>{selected ? "✓" : ""}</span>
                      <span className="print-session-index">{String(index + 1).padStart(2, "0")}</span>
                      <span><strong>{s.title}</strong><small>{s.unprinted} new · {s.total - s.unprinted} printed · {s.total} total</small></span>
                    </button>
                    <button
                      className={`print-session-state ${allPrinted ? "done" : ""}`}
                      onClick={() => setPrintedState(ids, allPrinted ? "unmark" : "mark")}
                      title={allPrinted ? "Reset this whole session to unprinted" : "Mark every question in this session as printed"}
                    >
                      {allPrinted ? "Printed ✓ · reset" : "Mark session printed"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="print-search-row field">
          <label>Search inside this scope</label>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Question text, answer, tag… e.g. tag:tcp retransmission" />
          <div className="print-search-hint">Plain words search everything. Advanced filters: <code>tag:</code>, <code>topic:</code>, <code>session:</code>, <code>type:</code>.</div>
        </div>

        <div className="print-picker">
          <div className="print-picker-head">
            <div><div className="eyebrow">2 · Fine tune</div><strong>Exact card selection</strong>{selectedSessionLabel && <span className="muted"> · {selectedSessionLabel}</span>}</div>
            <div className="actions">
              <button className="btn small ghost" onClick={() => { setSelection(null); setCoverSelection(null); }}>All shown</button>
              <button className="btn small ghost" onClick={() => { setSelection(new Set()); setCoverSelection(new Set()); }}>Clear</button>
              <button className="btn small ghost" disabled={!selectedIds.length} onClick={() => setPrintedState(selectedIds, "mark")}>Mark selected printed</button>
              <button className="btn small ghost" disabled={!selectedIds.length} onClick={() => setPrintedState(selectedIds, "unmark")}>Reset print status</button>
            </div>
          </div>
          {filteredQuestions.length === 0 && coverCandidateTopics.length === 0 ? (
            <div className="print-picker-empty">Nothing matches this scope. Try “All matching questions” if these cards were already printed.</div>
          ) : (
            <div className="print-question-list">
              {coverCandidateTopics.map((topicSlug) => {
                const checked = coverSelection === null ? true : coverSelection.has(topicSlug);
                return (
                  <label className={`print-question-row print-cover-picker-row ${checked ? "selected" : ""}`} key={`cover:${topicSlug}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleCover(topicSlug)} />
                    <span className="print-question-copy">
                      <strong>{titleFromSlug(topicSlug)} — topic overview card</strong>
                      <small>Divider / front page · blank back · include or remove it exactly like any question card</small>
                    </span>
                    <span className="print-state-pill cover">overview</span>
                  </label>
                );
              })}
              {filteredQuestions.map((q) => {
                const checked = selection === null ? true : selection.has(q.id);
                return (
                  <label className={`print-question-row ${checked ? "selected" : ""}`} key={q.id}>
                    <input type="checkbox" checked={checked} onChange={() => toggleQuestion(q.id)} />
                    <span className="print-question-copy">
                      <strong>{q.questionMd}</strong>
                      <small>{sessionTitle.get(q.sessionSlug || "") || (q.sessionSlug ? titleFromSlug(q.sessionSlug) : "No session assigned")} · L{q.difficulty} · {q.type}{q.tags?.length ? ` · ${q.tags.slice(0, 3).join(", ")}` : ""}</small>
                    </span>
                    <span className={`print-state-pill ${q.lastPrintedAt ? "done" : "new"}`}>{q.lastPrintedAt ? `printed ×${q.printCount || 1}` : "new"}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="print-control-grid">
          <div className="field"><label>Card contents</label><select className="select" value={printMode} onChange={(e) => setPrintMode(e.target.value as PrintMode)}><option value="qa">Question front · answer back</option><option value="questions">Questions on both sides</option></select></div>
          <div className="field"><label>Paper</label><select className="select" value={paper} onChange={(e) => setPaper(e.target.value as any)}><option>A4</option><option>A3</option></select></div>
          <div className="field"><label>Layout</label><select className="select" value={layoutId} onChange={(e) => setLayoutId(e.target.value)}>{layouts.map((x) => <option value={x.id} key={x.id}>{x.name} — {x.desc}</option>)}</select></div>
          <div className="field"><label>Duplex flip</label><select className="select" value={edge} onChange={(e) => setEdge(e.target.value as any)}><option value="long">Long edge</option><option value="short">Short edge</option></select></div>
        </div>

        <div className="print-format-panel">
          <div className="print-format-head">
            <div><div className="eyebrow">3 · Card design</div><strong>Typography & fit</strong></div>
            <span>Study 6 + Auto-fit is the compact default. Auto-fit measures every card and shrinks only cards that would clip.</span>
          </div>
          <div className="print-format-grid">
            <div className="field"><label>Font</label><select className="select" value={cardFont} onChange={(e) => setCardFont(e.target.value as CardFont)}><option value="serif">Serif — book / notes</option><option value="sans">Sans — clean / compact</option><option value="mono">Mono — technical / code</option></select></div>
            <div className="field"><label>Text alignment</label><select className="select" value={cardAlign} onChange={(e) => setCardAlign(e.target.value as CardTextAlign)}><option value="left">Left aligned</option><option value="center">Centered</option></select></div>
            <div className="field"><label>Vertical placement</label><select className="select" value={cardVertical} onChange={(e) => setCardVertical(e.target.value as CardVerticalAlign)}><option value="center">Centered vertically</option><option value="top">Top aligned</option></select></div>
            <div className="field"><label>Density / fitting</label><select className="select" value={cardDensity} onChange={(e) => setCardDensity(e.target.value as CardDensity)}><option value="auto">Auto-fit — compact + shrink overflow</option><option value="compact">Compact — fixed small type</option><option value="comfortable">Comfortable — larger type</option></select></div>
          </div>
        </div>

        <div className="print-options">
          <label><input type="checkbox" checked={cutGuides} onChange={(e) => setCutGuides(e.target.checked)} /> cut borders</label>
          <label><input type="checkbox" checked={showMeta} onChange={(e) => setShowMeta(e.target.checked)} /> metadata</label>
          <label><input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} /> due only</label>
          <span className="muted">{selectedQuestions.length} questions · {selectedCoverTopics.length} overview card{selectedCoverTopics.length === 1 ? "" : "s"} · {physicalCards.length} physical cards · {occupiedSideCount} occupied sides · {printedPageCount} printed pages</span>
        </div>

        <div className="print-help">Topic overview cards live in the exact-card picker, so you can include or remove each one independently. {printMode === "qa" ? <>Questions use the front and answers are mirrored behind them.</> : <>Question-only mode uses both sides for recall questions; selected overview cards keep a blank back.</>} Markdown formatting is rendered normally. <strong>Auto-fit</strong> is designed for dense Study 6 cards: it starts compact, then progressively reduces only overflowing cards before printing.</div>
        <div className="actions">
          <button className="btn accent" disabled={!hasPrintableCards} onClick={print}>Print / Save PDF</button>
          <button className="btn secondary" disabled={!hasPrintableCards} onClick={downloadHtml}>Download standalone HTML</button>
          {status && <span className="inline-status">{status}</span>}
        </div>

        {pendingPrintIds.length > 0 && (
          <div className="print-after">
            <div><strong>Did that print/save succeed?</strong><span>Mark these {pendingPrintIds.length} questions as printed so they disappear from the default queue next time.</span></div>
            <div className="actions"><button className="btn small accent" onClick={() => setPrintedState(pendingPrintIds, "mark")}>Yes — mark printed</button><button className="btn small ghost" onClick={() => setPendingPrintIds([])}>Not yet</button></div>
          </div>
        )}
      </div>

      <style>{`@media print{@page{size:${paper} portrait;margin:0}}`}</style>
      {!hasPrintableCards ? <div className="empty">No cards selected to print.</div> : (
        <div className="print-preview">
          {sheetPlans.flatMap((sheet, pageIndex) => {
            const cap = layout.cols * layout.rows;
            const base: CSSProperties = { ...printFormatStyle, gridTemplateColumns: `repeat(${layout.cols},1fr)`, gridTemplateRows: `repeat(${layout.rows},1fr)` };
            const fitKey = `${layoutId}:${paper}:${cardFont}:${cardAlign}:${cardVertical}:${cardDensity}:${showMeta}`;
            const result = [
              <section className={`print-sheet paper-${paper.toLowerCase()}`} style={base} key={`f-${pageIndex}`}>
                <SheetLabel side="FRONT" page={pageIndex + 1} />
                {Array.from({ length: cap }, (_, i) => { const side = sheet.front[i]; return <Card key={i} item={side?.item} face={side?.face || "question"} cuts={cutGuides} meta={showMeta} autoFit={cardDensity === "auto"} fitKey={`${fitKey}:front:${pageIndex}:${i}`} />; })}
              </section>,
            ];
            if (sheet.back.some(Boolean)) result.push(
              <section className={`print-sheet paper-${paper.toLowerCase()}`} style={base} key={`b-${pageIndex}`}>
                <SheetLabel side="BACK" page={pageIndex + 1} />
                {Array.from({ length: cap }, (_, i) => { const side = sheet.back[mirror(i, layout.cols, layout.rows, edge)]; return <Card key={i} item={side?.item} face={side?.face || "question"} cuts={cutGuides} meta={showMeta} autoFit={cardDensity === "auto"} fitKey={`${fitKey}:back:${pageIndex}:${i}`} />; })}
              </section>,
            );
            return result;
          })}
        </div>
      )}
    </div>
  );
}

function SheetLabel({ side, page }: { side: string; page: number }) { return <div className="sheet-label">{side} · SHEET {page}</div>; }
function TopicCover({ topicSlug }: { topicSlug: string }) {
  return <div className="topic-cover topic-cover-v2">
    <div className="topic-cover-band"><span>RECALL FORGE</span><strong>TOPIC DECK</strong></div>
    <div className="topic-cover-core">
      <div className="topic-cover-kicker">REVISION CARDS · START HERE</div>
      <div className="topic-cover-title">{titleFromSlug(topicSlug)}</div>
      <div className="topic-cover-rule"><span /></div>
      <div className="topic-cover-subtitle">Use this divider to spot where the topic begins instantly. Questions from this topic follow behind it.</div>
    </div>
    <div className="topic-cover-footer"><span>{topicSlug}</span><b>→</b></div>
  </div>;
}

function Card({ item, face, cuts, meta, autoFit, fitKey }: { item?: PrintableItem; face: "question" | "answer"; cuts: boolean; meta: boolean; autoFit: boolean; fitKey: string }) {
  const identity = !item ? "empty" : item.kind === "topic-cover" ? `cover:${item.topicSlug}` : `question:${item.question.id}`;
  const cardRef = useAutoFitCard(autoFit && !!item, `${fitKey}:${identity}:${face}`);
  if (!item) return <div className="print-card empty-card" />;
  if (item.kind === "topic-cover") {
    if (face === "answer") return <div className="print-card empty-card" style={cssVars(item.tone)} />;
    return <article ref={cardRef} className={`print-card fit-card topic-card ${cuts ? "cuts" : ""}`} style={cssVars(item.tone)}><div className="print-card-meta topic-meta">TOPIC · COVER CARD</div><TopicCover topicSlug={item.topicSlug} /></article>;
  }
  const q = item.question;
  const correctLetters = (q.correctOptionIndexes || []).map((i) => String.fromCharCode(65 + i));
  return <article ref={cardRef} className={`print-card fit-card ${cuts ? "cuts" : ""}`} style={cssVars(item.tone)}><div className="print-card-meta">{meta ? <><span className="topic-dot" />L{q.difficulty} · {q.type} · {q.topicSlug}{q.sessionSlug ? ` · ${q.sessionSlug}` : ""}</> : null}</div><div className="print-card-flow"><div className="print-card-kind">{face === "question" ? "QUESTION" : "ANSWER"}</div><MarkdownBlock className="print-card-body markdown-print-body" markdown={face === "question" ? q.questionMd : q.answerMd} />{face === "question" && q.format === "multi_select" && <ol className="print-multi-options">{(q.options || []).map((x, i) => <li key={i}><b>{String.fromCharCode(65 + i)}</b><span>{x}</span></li>)}</ol>}{face === "answer" && q.format === "multi_select" && <div className="print-multi-correct">Correct: {correctLetters.length ? correctLetters.join(", ") : "none"}</div>}{face === "answer" && !!q.keyPoints?.length && <ul className="print-keypoints">{q.keyPoints.map((x, i) => <li key={i}>{x}</li>)}</ul>}</div></article>;
}

function renderPrintableItemHtml(item: PrintableItem | undefined, face: "question" | "answer", cuts: boolean, meta: boolean) {
  if (!item) return `<div class="cell empty"></div>`;
  if (item.kind === "topic-cover") {
    if (face === "answer") return `<div class="cell empty" style="${toneStyle(item.tone)}"></div>`;
    return `<article class="cell fit-card topic-card ${cuts ? "cuts" : ""}" style="${toneStyle(item.tone)}"><div class="meta topic-meta">TOPIC · COVER CARD</div>${renderTopicCoverHtml(item.topicSlug)}</article>`;
  }
  const q = item.question;
  const options = face === "question" && q.format === "multi_select" ? `<ol class="multi-options">${(q.options || []).map((x, i) => `<li><b>${String.fromCharCode(65 + i)}</b><span>${esc(x)}</span></li>`).join("")}</ol>` : "";
  const correct = face === "answer" && q.format === "multi_select" ? `<div class="multi-correct">Correct: ${(q.correctOptionIndexes || []).length ? (q.correctOptionIndexes || []).map((i) => String.fromCharCode(65 + i)).join(", ") : "none"}</div>` : "";
  return `<article class="cell fit-card ${cuts ? "cuts" : ""}" style="${toneStyle(item.tone)}"><div class="meta">${meta ? `${topicDotHtml()}L${q.difficulty} · ${esc(q.type)} · ${esc(q.topicSlug)}${q.sessionSlug ? ` · ${esc(q.sessionSlug)}` : ""}` : ""}</div><div class="flow"><div class="kind">${face === "question" ? "QUESTION" : "ANSWER"}</div><div class="body">${markdownToHtml(face === "question" ? q.questionMd : q.answerMd)}</div>${options}${correct}${face === "answer" && q.keyPoints?.length ? `<ul class="keypoints">${q.keyPoints.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div></article>`;
}
function toneStyle(tone: TopicTone) { return `--topic-border:${tone.border};--topic-fill:${tone.fill};--topic-soft:${tone.soft};--topic-ink:${tone.ink};--topic-badge:${tone.badge};`; }
function topicDotHtml() { return `<span style="display:inline-block;width:7px;height:7px;border-radius:999px;background:var(--topic-border);margin-right:6px;vertical-align:middle"></span>`; }
function renderTopicCoverHtml(topicSlug: string) { return `<div class="topic-cover topic-cover-v2"><div class="topic-cover-band"><span>RECALL FORGE</span><strong>TOPIC DECK</strong></div><div class="topic-cover-core"><div class="topic-cover-kicker">REVISION CARDS · START HERE</div><div class="topic-cover-title">${esc(titleFromSlug(topicSlug))}</div><div class="topic-cover-rule"><span></span></div><div class="topic-cover-subtitle">Use this divider to spot where the topic begins instantly. Questions from this topic follow behind it.</div></div><div class="topic-cover-footer"><span>${esc(topicSlug)}</span><b>→</b></div></div>`; }
