import Link from "next/link";
import { getWeekKickoffs, type TeamKickoff } from "@/lib/espn-schedule";
import { prisma } from "@/lib/prisma";
import { computeTeamWeekScore, pairStarters, winProbability } from "@/lib/matchup-score";
import { matchupsForWeek, SEASON_WEEKS } from "@/lib/schedule";
import { computeStandings } from "@/lib/standings";
import { MatchupStarters } from "./matchup-starters";
import { TeamSide } from "./team-side";
import { Card, EmptyState } from "../ui";

export default async function MatchupsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; match?: string }>;
}) {
  const { week: rawWeek, match: rawMatch } = await searchParams;
  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });

  const defaultWeek = syncState?.week ?? 1;
  const week = Math.min(SEASON_WEEKS, Math.max(1, Number(rawWeek) || defaultWeek));

  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t]));

  const pairs = matchupsForWeek(week);
  const matchIndex = Math.min(pairs.length - 1, Math.max(0, Number(rawMatch) || 0));
  const [nameA, nameB] = pairs[matchIndex] ?? [];

  const season = syncState?.season;
  const seasonType = syncState?.seasonType ?? "regular";

  const records = season
    ? await computeStandings(season, seasonType, Math.max(0, (syncState?.week ?? 1) - 1))
    : new Map();

  const teamA = nameA ? teamByName.get(nameA.toLowerCase()) : undefined;
  const teamB = nameB ? teamByName.get(nameB.toLowerCase()) : undefined;

  const kickoffs = season
    ? await getWeekKickoffs(season, week, seasonType)
    : new Map<string, TeamKickoff>();

  const [scoreA, scoreB] = season
    ? await Promise.all([
        computeTeamWeekScore(teamA?.id, season, week, seasonType, kickoffs),
        computeTeamWeekScore(teamB?.id, season, week, seasonType, kickoffs),
      ])
    : [null, null];
  const winPct = season && teamA && teamB && scoreA && scoreB ? winProbability(scoreA, scoreB) : null;
  const recordA = teamA ? records.get(teamA.id) : null;
  const recordB = teamB ? records.get(teamB.id) : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Matchups</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/matchups?week=${Math.max(1, week - 1)}`}
            className="text-muted transition-colors hover:text-foreground"
            aria-disabled={week === 1}
          >
            ← Prev
          </Link>
          <span className="font-medium">
            Week {week} of {SEASON_WEEKS}
          </span>
          <Link
            href={`/matchups?week=${Math.min(SEASON_WEEKS, week + 1)}`}
            className="text-muted transition-colors hover:text-foreground"
            aria-disabled={week === SEASON_WEEKS}
          >
            Next →
          </Link>
        </div>
      </div>

      {!season ? (
        <EmptyState>No synced data yet — run a sync from the home page.</EmptyState>
      ) : (
        <>
          <nav className="flex flex-wrap gap-2">
            {pairs.map(([pa, pb], i) => (
              <Link
                key={`${pa}-${pb}`}
                href={`/matchups?week=${week}&match=${i}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  i === matchIndex
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-muted hover:border-accent hover:text-foreground"
                }`}
              >
                {teamByName.get(pa.toLowerCase())?.name ?? pa} vs{" "}
                {teamByName.get(pb.toLowerCase())?.name ?? pb}
              </Link>
            ))}
          </nav>

          {nameA && nameB && (
            <Card>
              <div className="flex items-start justify-between gap-4">
                <TeamSide
                  teamName={teamA?.name ?? nameA}
                  record={recordA ? `${recordA.wins}-${recordA.losses}` : null}
                  score={teamA ? scoreA : null}
                  winPct={winPct}
                  align="left"
                />
                <span className="mt-6 shrink-0 rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold text-muted">
                  VS
                </span>
                <TeamSide
                  teamName={teamB?.name ?? nameB}
                  record={recordB ? `${recordB.wins}-${recordB.losses}` : null}
                  score={teamB ? scoreB : null}
                  winPct={winPct != null ? 1 - winPct : null}
                  align="right"
                />
              </div>
              {winPct != null && (
                <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full"
                    style={{ width: `${winPct * 100}%`, backgroundColor: "var(--accent)" }}
                  />
                  <div
                    className="h-full"
                    style={{ width: `${(1 - winPct) * 100}%`, backgroundColor: "var(--danger)" }}
                  />
                </div>
              )}
              {(!teamA || !teamB) && (
                <p className="mt-3 text-xs text-muted">
                  {!teamA && `No team named "${nameA}" yet. `}
                  {!teamB && `No team named "${nameB}" yet.`}
                </p>
              )}
              {scoreA && scoreB && (scoreA.players.length > 0 || scoreB.players.length > 0) && (
                <div className="mt-4 border-t border-border pt-3">
                  <MatchupStarters rows={pairStarters(scoreA.players, scoreB.players)} />
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </main>
  );
}
