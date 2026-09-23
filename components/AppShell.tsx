import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["01", "Dashboard", "/"],
  ["02", "Today", "/today"],
  ["03", "Roadmap", "/roadmap"],
  ["04", "Prompt Studio", "/prompts"],
  ["05", "Question Bank", "/questions"],
  ["06", "Review", "/review"],
  ["07", "Print", "/print"],
  ["08", "Mistakes", "/mistakes"],
];

export default function AppShell({ children }: { children: ReactNode }) {
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">R</div><div><div className="brand-name">Recall Forge</div><div className="brand-sub">deliberate practice</div></div></div>
      <nav className="nav">{nav.map(([n, label, href]) => <Link href={href} key={href}><span className="nav-num">{n}</span><span>{label}</span></Link>)}</nav>
      <div className="sidebar-footer">Plan the day → learn one session → retrieve later.<br/>PostgreSQL stores your roadmap, daily plan, questions, review state and mistakes.</div>
    </aside>
    <main className="main"><header className="topbar"><div className="topbar-title">Deliberate practice system</div><div className="topbar-right">Plan → Learn → Recall → Critique → Apply</div></header><div className="content">{children}</div></main>
    <nav className="mobile-nav">{nav.slice(0, 6).map(([n, label, href]) => <Link href={href} key={href}><span>{n}</span><small>{label}</small></Link>)}</nav>
  </div>;
}
