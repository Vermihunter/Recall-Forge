import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

function loadLocalEnv() {
  const candidates = [".env.local", ".env"];
  for (const filename of candidates) {
    const full = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(full)) continue;
    for (const raw of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
    break;
  }
}

loadLocalEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing. Put it in .env.local or export it in the shell.");
  process.exit(1);
}

const scope = String(process.env.RESET_SCOPE || "all").toLowerCase();
if (!new Set(["all", "roadmap"]).has(scope)) {
  console.error("RESET_SCOPE must be either 'all' or 'roadmap'.");
  process.exit(1);
}

if (process.env.CONFIRM_RESET !== "RESET_RECALL_FORGE") {
  console.error("Refusing to delete data.");
  console.error("Run with CONFIRM_RESET=RESET_RECALL_FORGE and optionally RESET_SCOPE=roadmap.");
  process.exit(1);
}

const parsed = new URL(url);
console.log(`Reset target: ${parsed.hostname}${parsed.pathname}`);
console.log(`Reset scope: ${scope}`);

const sql = neon(url);

// Revision sessions are derived study state and should never survive a roadmap reset.
await sql`delete from question_attempts`;
await sql`delete from revision_session_items`;
await sql`delete from revision_sessions`;

if (scope === "all") {
  await sql`delete from ai_sessions`;
  await sql`delete from mistakes`;
  await sql`delete from questions`;
}

await sql`delete from roadmap_sessions`;
await sql`delete from topics`;

console.log(scope === "all"
  ? "Recall Forge study data cleared: roadmap, questions, mistakes and AI-session history."
  : "Roadmap cleared. Questions, mistakes and AI-session history were kept.");
console.log("Automatic starter seeding is disabled; import your roadmap JSON next.");
