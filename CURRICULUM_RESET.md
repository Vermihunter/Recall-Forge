# Clean curriculum reset

Recall Forge no longer auto-inserts the bundled starter roadmap when the database is empty. The roadmap is now explicitly controlled by JSON imports.

## 1. Apply schema changes

The daily planner adds `planned_for` and `plan_order` columns to `roadmap_sessions`:

```bash
npm run db:push
```

## 2. Optional: clear existing study data

The reset script reads `DATABASE_URL` from `.env.local`, `.env`, or the shell. It refuses to run without an explicit confirmation token.

Clear everything managed by Recall Forge (roadmap, questions, mistakes and AI-session history):

```bash
CONFIRM_RESET=RESET_RECALL_FORGE npm run db:reset-study
```

Clear only roadmap topics/sessions while keeping questions, mistakes and AI-session history:

```bash
CONFIRM_RESET=RESET_RECALL_FORGE RESET_SCOPE=roadmap npm run db:reset-study
```

**Check which `DATABASE_URL` you are using before running this against production.** The command prints the target database host before deletion.

## 3. Import the new curriculum

Open **Roadmap → Import roadmap JSON** and select the supplied deep curriculum JSON.

The import is slug-based. Re-importing later updates curriculum text while preserving session status and daily planning fields.

## 4. Build each day

Open **Today**. Choose a date and either:

- search for exact sessions and add them manually, or
- set a target number of minutes and use **Fill to target**.

You can reorder sessions, mark them done, remove them from the day, or launch the Session Coach directly.
