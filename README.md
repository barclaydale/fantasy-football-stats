# fantasy-football-stats

An in-depth fantasy football stats dashboard. **Next.js**, backed by **Postgres via Prisma**, on
**Vercel** — the same setup used by `coaching-dash`, `board-game-night` and
`honeymoon-research` in this folder. Rosters (which players are on which team) live in the
database, not the browser, so they survive a cleared cache or a new device.

## How it's put together

- `prisma/schema.prisma` — two models: `Team` and `Player`. A player's `teamId` points at the
  fantasy team that currently rosters them; `null` means a free agent. That direct foreign key is
  all "who's on whose team" needs — no join table.
- `src/app/page.tsx` — server component that reads teams + free agents straight from the database.
- `src/app/actions.ts` — server actions (`"use server"`) for creating teams/players and
  reassigning a player to a different team or back to free agency.

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
3. **Deploy** (Deployments → **Redeploy** if you've already deployed once before attaching the
   database — new env vars only apply to new deployments). The build command
   (`prisma generate && prisma migrate deploy && next build`, see `package.json`) creates the
   `Team` and `Player` tables on the first deploy by applying `prisma/migrations/`.

## Local dev

```
npm install
vercel env pull .env   # once the project is linked + the database is attached
npm run dev
```

`.env.example` shows the shape of `.env` if you'd rather point at your own local Postgres instead.
