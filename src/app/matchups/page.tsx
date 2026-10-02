import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeTeamWeekScore, winProbability } from "@/lib/matchup-score";
import { matchupsForWeek, SEASON_WEEKS } from "@/lib/schedule";
import { computeStandings } from "@/lib/standings";
import { TeamSide, TeamStarters } from "./team-side";
import { Card, EmptyState } from "../ui";

export default async function MatchupsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: rawWeek } = await searchParams;
  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });

  const defaultWeek = syncState?.week ?? 1;
  const week = Math.min(SEASON_WEEKS, Math.max(1, Number(rawWeek) || defaultWeek));

  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t]));

  const pairs = matchupsForWeek(week);
  const season = syncState?.season;
  const seasonType = syncState?.seasonType ?? "regular";

  const records = season
    ? await computeStandings(season, seasonType, Math.max(0, (syncState?.week ?? 1) - 1))
    : new Map();

  const matchups = season
    ? await Promise.all(
        pairs.map(async ([nameA, nameB]) => {
          const teamA = teamByName.get(nameA.toLowerCase());
          const teamB = teamByName.get(nameB.toLowerCase());
          const [scoreA, scoreB] = await Promise.all([
            computeTeamWeekScore(teamA?.id, season, week, seasonType),
            computeTeamWeekScore(teamB?.id, season, week, seasonType),
          ]);
          const winPct = teamA && teamB ? winProbability(scoreA, scoreB) : null;
          const recordA = teamA ? records.get(teamA.id) : null;
          const recordB = teamB ? records.get(teamB.id) : null;
          return { nameA, nameB, teamA, teamB, scoreA, scoreB, winPct, recordA, recordB };
        }),
      )
    : [];

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
        <div className="flex flex-col gap-4">
          {matchups.map(({ nameA, nameB, teamA, teamB, scoreA, scoreB, winPct, recordA, recordB }) => {
            const leftPct = winPct != null ? winPct : null;
            const rightPct = winPct != null ? 1 - winPct : null;
            return (
              <Card key={`${nameA}-${nameB}`}>
                <div className="flex items-start justify-between gap-4">
                  <TeamSide
                    teamName={teamA?.name ?? nameA}
                    record={recordA ? `${recordA.wins}-${recordA.losses}` : null}
                    score={teamA ? scoreA : null}
                    winPct={leftPct}
                    align="left"
                  />
                  <span className="mt-6 shrink-0 rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold text-muted">
                    VS
                  </span>
                  <TeamSide
                    teamName={teamB?.name ?? nameB}
                    record={recordB ? `${recordB.wins}-${recordB.losses}` : null}
                    score={teamB ? scoreB : null}
                    winPct={rightPct}
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
                {(scoreA.players.length > 0 || scoreB.players.length > 0) && (
                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-3">
                    <TeamStarters players={scoreA.players} align="left" />
                    <TeamStarters players={scoreB.players} align="right" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
