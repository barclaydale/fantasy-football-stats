# fantasy-football-stats

An in-depth fantasy football stats dashboard. **Next.js**, backed by **Postgres via Prisma**, on
**Vercel** — the same setup used by `coaching-dash`, `board-game-night` and
`honeymoon-research` in this folder. Rosters (which players are on which team) live in the
database, not the browser, so they survive a cleared cache or a new device. Player identity,
status/injury info, and weekly stats are synced from **Sleeper**, free, no API key.

## Where the data comes from

Sleeper has two relevant hosts:

- `api.sleeper.app/v1` — documented, stable public API. Used here for player identity/status
  (`/players/nfl`, ~12k players) and the current NFL week (`/state/nfl`). Sleeper asks that the
  players endpoint only be called about once a day, since it's a ~15MB payload.
- `api.sleeper.com` — undocumented (it's what Sleeper's own app calls), but it's the only place
  that still serves weekly stats; Sleeper pulled the stats endpoint from the documented v1 API at
  their data provider's request. `GET /stats/nfl/{season}/{week}?season_type=regular` returns
  every stat category Sleeper tracks per player per week (passing/rushing/receiving/defense/
  kicking/punting, snap counts, red zone usage, PPR/half-PPR/standard points — 200+ possible
  fields), which is what "mirror Sleeper's stats" is built on.

Both are free and need no auth, but `api.sleeper.com` is undocumented — if Sleeper ever changes
its shape, `src/lib/sleeper.ts` is the one place that would need updating.

## How it's put together

- `prisma/schema.prisma`:
  - `Team` — a fantasy team.
  - `Player` — one row per real NFL player, id = Sleeper's own `player_id` (so re-syncing is a
    plain upsert). `fantasyTeamId` points at the team that currently rosters them; `null` means a
    free agent.
  - `PlayerStatLine` — one row per player per week. `stats` keeps Sleeper's entire raw stat blob
    (it varies a lot by position) as JSON, with `ptsStd`/`ptsPpr`/`ptsHalfPpr` pulled out as columns
    since every view needs to sort on those.
  - `SyncState` — a singleton row tracking the last successful sync (season/week/timestamp), so
    the UI knows what it's showing without calling Sleeper on every page load.
- `src/lib/sleeper.ts` — the Sleeper API client.
- `src/lib/sync.ts` — `syncSleeperData()`: pulls players + the current week's stats and bulk-
  upserts both (raw SQL `INSERT ... ON CONFLICT`, batched, since Prisma has no native upsert-many).
  Pass `{ backfillWeeks: true }` once to pull every earlier week of the season too.
- `src/app/api/sync/route.ts` — the route the daily cron hits. Checks the `CRON_SECRET` header
  Vercel sends on cron requests so randos can't trigger a sync.
- `src/app/actions.ts` — server actions for creating teams, reassigning a player to a different
  team or free agency, and a manual `runManualSync` (used by the "Sync now" button on the page —
  the same function the cron calls, just triggered by hand).
- `vercel.json` — the cron: once a day. **Why daily, not hourly:** Vercel's free Hobby plan caps
  cron jobs at once per day; hourly needs the paid Pro plan. Keeping this free was the point.

## Deploy on Vercel (one-time setup)

1. **Push this repo to GitHub** (already done) and import it in Vercel: **Add New → Project →**
   select the repo. **Framework Preset must be "Next.js"** — if the project was imported back
   when the repo only had a README, it may default to "Other"; fix it under **Settings → General
   → Build and Deployment**.
2. **Add a database.** Vercel dashboard → your project → **Storage** → **Create Database** →
   **Postgres** (Neon, via the Vercel Marketplace) → free plan is plenty → **Connect to Project**.
   This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically for all environments.
   **Note:** creating the database alone isn't enough — click **Connect to Project** on the
   database itself (Storage → your database) so it actually attaches to this Vercel project.
3. **Set `CRON_SECRET`.** Project → **Settings → Environment Variables** → add `CRON_SECRET` with
   a random value (`openssl rand -hex 32`), for Production (and Preview/Development if you want
   the cron tested there too). Vercel automatically sends it as a header on cron-triggered
   requests to `/api/sync` — you don't wire anything else up.
4. **Deploy** (Deployments → **Redeploy** if you've already deployed once before attaching the
   database/env vars — they only apply to new deployments). The build command
   (`prisma generate && prisma migrate deploy && next build`, see `package.json`) creates the
   tables on the first deploy by applying `prisma/migrations/`.
5. **Run the first sync.** Open the deployed site and click **Sync now** with "Backfill the whole
   season" checked, so you start with the full season's stats instead of just the current week.
   After that, the daily cron (`vercel.json`, currently 13:00 UTC) keeps the current week current
   automatically — no more manual syncs needed.

## Local dev

```
npm install
vercel env pull .env   # once the project is linked + the database is attached
npm run dev
```

`.env.example` shows the shape of `.env` if you'd rather point at your own local Postgres instead.
