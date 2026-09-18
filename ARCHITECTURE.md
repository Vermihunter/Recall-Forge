# Recall Forge v0.2 Architecture

## Core product model

The previous version treated a roadmap topic as the unit sent to ChatGPT. v0.2 separates two concepts:

- **Topic** — syllabus container and grouping unit.
- **Roadmap session** — concrete bounded learning unit intended to map to one ChatGPT conversation.

A roadmap session owns:

- title / slug
- order
- objective
- in-scope concepts
- exit criteria
- estimated time
- status
- personal notes

Revision questions may reference both `topicSlug` and `sessionSlug`.

## Learning flow

```text
Roadmap
  ↓
Concrete session
  ↓
Session Coach prompt
  ↓
ChatGPT Pro conversation
  ├─ mental model
  ├─ micro-teaching
  ├─ retrieval
  ├─ reconstruction
  ├─ critique
  ├─ application
  └─ revision JSON
       ↓
Question Bank
       ↓
Spaced Review / Printable Cards
```

Recall Forge still does not attempt to use a ChatGPT subscription as an API credential. The bridge remains copy/open/paste.

## Persistence

PostgreSQL tables:

- `topics`
- `roadmap_sessions`
- `questions`
- `mistakes`
- `ai_sessions`

The app uses Drizzle ORM and the Neon serverless driver.

No demo questions are seeded. Default roadmap topics/sessions are seeded only when the topic table is empty.

## Question provenance

`questions.origin` is one of the conceptual values:

- `user` — created directly through the API
- `import` — imported JSON
- `seed` — reserved, but v0.2 does not create seed questions

This makes ongoing export semantics explicit.

## Printing

The print renderer chunks filtered questions by a chosen grid capacity.

For duplex alignment, the back page uses the front slot transformed by the requested flip axis:

```text
long-edge:  mirror columns
short-edge: mirror rows
```

The same mapping is used for:

- the in-app print preview
- browser printing / PDF generation
- standalone HTML export

## Deployment

Recall Forge is stateless from Vercel's perspective. All durable learning data lives in PostgreSQL.

An optional middleware Basic Auth gate is enabled only when `APP_PASSWORD` is configured.
