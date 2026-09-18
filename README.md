# Recall Forge v0.2

A single-user deliberate-practice app built around one unit of work:

> **one roadmap session = one ChatGPT conversation**

The broad roadmap still organizes your preparation, but you no longer ask ChatGPT to “teach Networking” or even “teach From URL to server.” Each topic is split into concrete bounded sessions with an explicit scope, exit criteria and estimated duration.

## What changed in v0.2

### 1. Concrete roadmap sessions

Topics are now containers. Sessions are the thing you actually study.

Example: **Networking → From URL to server** is split into 12 chats:

1. URL parsing and browser request setup
2. DNS resolution path
3. Local network: interface, subnet and next hop
4. IP forwarding across routers
5. NAT, stateful firewalls and edge translation
6. TCP connection establishment
7. TCP reliable byte stream
8. TCP congestion control
9. TLS handshake and certificate validation
10. HTTP/1.1 request and response
11. Response delivery and browser processing
12. Full-path reconstruction and adversarial retrieval

The rest of the default roadmap is decomposed the same way into smaller sessions.

### 2. Session Coach

**Session Coach** is now the default ChatGPT handoff when you start a roadmap session.

A single chat runs these phases:

1. Orient / mental model
2. Teach one micro-section at a time
3. Retrieval after every micro-section
4. Reconstruct the complete session from memory
5. Critique the reconstruction
6. Apply/debug/compare
7. Adversarial retrieval
8. Close with weak points and optional revision-question JSON

The generated prompt explicitly forbids drifting into later roadmap sessions.

### 3. Roadmap editor

The Roadmap page now supports:

- add topic
- edit topic
- delete topic
- add/edit/delete sessions
- edit session scope and exit criteria
- estimated minutes per session
- todo → active → done session status
- progress indicator per topic
- direct **Start chat** action for every session

### 4. Printable duplex cards

The Print page can generate browser-printable question/answer sheets with:

- A4
- A3
- 4-up / 6-up / 9-up / 12-up layouts
- long-edge duplex mirroring
- short-edge duplex mirroring
- optional metadata
- optional card borders / cut guides
- topic filtering
- due-only filtering
- browser **Print / Save PDF**
- standalone HTML download using the same imposition logic

Pages alternate FRONT / BACK. The answer-side grid is mirrored according to the selected duplex edge so answers line up behind their questions.

### 5. PostgreSQL / Vercel-ready

MongoDB/Mongoose is removed from the runtime application.

The current stack is:

- Next.js App Router
- React
- PostgreSQL
- Drizzle ORM
- Neon serverless PostgreSQL driver

The old `mongodb` dependency remains only for the one-time migration script.

### 6. Mobile review

The review flow has been redesigned for phones:

- bottom navigation
- large reveal button
- sticky grading controls above the mobile nav
- large touch targets for Again / Hard / Good / Easy
- compact metadata
- responsive roadmap/editor dialogs

## Local setup with Neon

Create a PostgreSQL database, then:

```bash
cp .env.example .env.local
```

Set:

```env
DATABASE_URL=postgresql://...
```

Install dependencies:

```bash
npm install
```

Create/update the database schema:

```bash
npm run db:push
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

On the first request, Recall Forge inserts the default roadmap and session definitions. It **does not insert demo questions** anymore.

## Optional single-user protection

For a personal deployment, set:

```env
APP_USERNAME=recall
APP_PASSWORD=<a-long-random-password>
```

When `APP_PASSWORD` is present, the app uses HTTPS Basic Auth through Next.js middleware. Leave it unset for local development if you do not want the browser login prompt.

## Migrating your current MongoDB questions

The original Recall Forge v0.1 generated sample questions with external IDs like:

```text
sample-1
sample-2
...
```

The migration exporter intentionally excludes those.

### 1. Point the new project at the old MongoDB

For your current local setup this will usually be:

```env
MIGRATION_MONGODB_URI=mongodb://localhost:27017/recall_forge
```

### 2. Export only your questions

```bash
npm run export:mongo-user-data
```

It creates:

```text
exports/user-questions-YYYY-MM-DD.json
```

The file contains only questions whose `externalId` does **not** start with `sample-`.

Review state is preserved when present.

### 3. Import into the PostgreSQL app

Open **Question Bank** → **Import JSON** → select the exported file.

The imported questions are stored with `origin = "import"` and become immediately available in the review and print flows.

## Ongoing backups

The Question Bank has **Export my questions**.

That endpoint exports all non-seed PostgreSQL questions as JSON. Since v0.2 seeds no questions, this is effectively your complete question collection.

## Vercel deployment

### Recommended path

1. Push this directory to GitHub.
2. Import the repository into Vercel.
3. Create/connect a Neon PostgreSQL database.
4. Add `DATABASE_URL` to the Vercel project environment variables.
5. Add `APP_USERNAME` and `APP_PASSWORD` for personal access protection.
6. Locally point `DATABASE_URL` at the same Neon database and run:

```bash
npm run db:push
```

7. Deploy.

The application does not require persistent local filesystem storage, so the important user data lives in PostgreSQL and survives Vercel deployments.

## Database commands

```bash
npm run db:generate
npm run db:push
npm run db:studio
```

For this personal project, `db:push` is the simplest workflow. If the schema starts evolving across multiple production environments, switch to generated SQL migrations committed to source control.

## Question JSON

Session Coach / Question Generator emits:

```json
{
  "questions": [
    {
      "id": "tcp-cwnd-rwnd-001",
      "topic": "networking-request",
      "session": "net-tcp-congestion",
      "subtopics": ["TCP", "congestion control"],
      "prerequisites": ["net-tcp-data"],
      "type": "explain",
      "difficulty": 3,
      "questionMd": "How do rwnd and cwnd constrain a TCP sender?",
      "answerMd": "...",
      "keyPoints": ["..."],
      "hints": [{ "level": 1, "text": "Think receiver vs network." }],
      "commonMistakes": ["..."],
      "expectedMinutes": 3,
      "tags": ["tcp"]
    }
  ]
}
```

The important addition is `session`, which connects revision questions to the concrete roadmap unit that produced them.

## Project structure

```text
recall-forge/
├── app/
│   ├── api/
│   │   ├── data/export/
│   │   ├── mistakes/
│   │   ├── questions/
│   │   ├── roadmap-sessions/
│   │   ├── sessions/
│   │   └── topics/
│   ├── mistakes/
│   ├── print/
│   ├── prompts/
│   ├── questions/
│   ├── review/
│   └── roadmap/
├── components/
├── db/
│   ├── index.ts
│   └── schema.ts
├── lib/
│   ├── defaultRoadmap.ts
│   ├── prompts.ts
│   ├── review.ts
│   └── seed.ts
├── scripts/
│   └── export-mongo-user-data.mjs
├── drizzle.config.ts
├── middleware.ts
└── package.json
```
