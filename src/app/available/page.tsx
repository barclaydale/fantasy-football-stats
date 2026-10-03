import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rankBestAvailable, scoreCandidates, VOLUME_STAT, type Candidate } from "@/lib/best-available";
import { sampleStdDev, trimmedMean } from "@/lib/weekly-stats";
import { TeamFilterSelect } from "./team-filter-select";
import { BackLink, EmptyState, InjuryBadge, PositionTag, TableShell, td, th, tr } from "../ui";

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;

type StatLineTotal = {
  playerId: string;
  _sum: { ptsPpr: number | null; recTargets: number | null; rushAtt: number | null; passAtt: number | null };
  _count: { _all: number };
};

type PlayerMeta = {
  id: string;
  fullName: string | null;
  position: string | null;
  nflTeam: string | null;
  injuryStatus: string | null;
};

// Builds one Candidate per player (bucketed by position) from a set of
// season-total rows — shared between the free-agent pool and a selected
// team's roster, since both need identical trimmed-mean/stdDev/volume math.
function buildCandidatesByPosition(
  totals: StatLineTotal[],
  playerById: Map<string, PlayerMeta>,
  weeklyPtsByPlayer: Map<string, number[]>,
): Map<string, Candidate[]> {
  const byPosition = new Map<string, Candidate[]>();
  for (const t of totals) {
    const player = playerById.get(t.playerId);
    if (!player?.position) continue;

    const weeklyPts = weeklyPtsByPlayer.get(t.playerId) ?? [];
    const tm = trimmedMean(weeklyPts);
    const sd = sampleStdDev(weeklyPts);
    if (tm == null || sd == null) continue; // fewer than 3 games — not enough to rank

    const volumeStat = VOLUME_STAT[player.position];
    const volume =
      volumeStat?.key === "passAtt"
        ? (t._sum.passAtt ?? 0)
        : volumeStat?.key === "rushAtt"
          ? (t._sum.rushAtt ?? 0)
          : volumeStat?.key === "targets"
            ? (t._sum.recTargets ?? 0)
            : null;

    const list = byPosition.get(player.position) ?? [];
    list.push({
      playerId: t.playerId,
      name: player.fullName ?? t.playerId,
      team: player.nflTeam,
      injuryStatus: player.injuryStatus,
      gp: t._count._all,
      trimmedMean: tm,
      stdDev: sd,
      volume,
    });
    byPosition.set(player.position, list);
  }
  return byPosition;
}

export default async function AvailablePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team: selectedTeamId } = await searchParams;
  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });
  const season = syncState?.season;

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const compareTeam = selectedTeamId ? teams.find((t) => t.id === selectedTeamId) : null;

  const [freeAgentTotals, teamTotals] = season
    ? await Promise.all([
        prisma.playerStatLine.groupBy({
          by: ["playerId"],
          where: { season, seasonType: "regular", player: { fantasyTeamId: null } },
          _sum: { ptsPpr: true, recTargets: true, rushAtt: true, passAtt: true },
          _count: { _all: true },
          having: { ptsPpr: { _sum: { gt: 0 } } },
          orderBy: { _sum: { ptsPpr: "desc" } },
          take: 500,
        }),
        compareTeam
          ? prisma.playerStatLine.groupBy({
              by: ["playerId"],
              where: { season, seasonType: "regular", player: { fantasyTeamId: compareTeam.id } },
              _sum: { ptsPpr: true, recTargets: true, rushAtt: true, passAtt: true },
              _count: { _all: true },
            })
          : Promise.resolve([]),
      ])
    : [[], []];

  const playerIds = [...freeAgentTotals, ...teamTotals].map((t) => t.playerId);
  const uniquePlayerIds = [...new Set(playerIds)];
  const [players, weeklyLines] = uniquePlayerIds.length
    ? await Promise.all([
        prisma.player.findMany({
          where: { id: { in: uniquePlayerIds } },
          select: { id: true, fullName: true, position: true, nflTeam: true, injuryStatus: true },
        }),
        prisma.playerStatLine.findMany({
          where: { playerId: { in: uniquePlayerIds }, season: season!, seasonType: "regular" },
          select: { playerId: true, ptsPpr: true },
        }),
      ])
    : [[], []];
  const playerById = new Map(players.map((p) => [p.id, p]));

  const weeklyPtsByPlayer = new Map<string, number[]>();
  for (const line of weeklyLines) {
    if (line.ptsPpr == null) continue;
    const arr = weeklyPtsByPlayer.get(line.playerId) ?? [];
    arr.push(line.ptsPpr);
    weeklyPtsByPlayer.set(line.playerId, arr);
  }

  const freeAgentsByPosition = buildCandidatesByPosition(freeAgentTotals, playerById, weeklyPtsByPlayer);
  const teamByPosition = buildCandidatesByPosition(teamTotals, playerById, weeklyPtsByPlayer);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <BackLink href="/">Teams</BackLink>
        <h1 className="text-xl font-semibold">Best Available{season ? ` — ${season}` : ""}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Top 5 free agents per position, ranked by a composite of trimmed-mean points
          (season average with the best and worst week dropped), consistency (inverse of
          standard deviation), and — where there&apos;s a reliable one synced — the position&apos;s
          key volume stat (targets for WR/TE, carries for RB, attempts for QB). K and DEF use
          points and consistency only. Needs at least 3 games played.
        </p>
      </div>

      {season && <TeamFilterSelect teams={teams} selectedTeamId={compareTeam?.id ?? ""} />}

      {!season ? (
        <EmptyState>No synced data yet — run a sync from the home page.</EmptyState>
      ) : (
        POSITIONS.map((position) => {
          const freeAgents = freeAgentsByPosition.get(position) ?? [];
          const teamPlayers = teamByPosition.get(position) ?? [];
          const volumeStat = VOLUME_STAT[position];

          // No team selected (or they have nobody at this position): the
          // plain top-5 free-agent list, same as before.
          let rows = rankBestAvailable(position, freeAgents);
          const ownedIds = new Set(teamPlayers.map((p) => p.playerId));

          if (teamPlayers.length > 0) {
            // Rank the combined pool and show at least 5 rows, extended far
            // enough to include every one of the team's players at their
            // true rank — even one that ranks below the top 5.
            const combined = scoreCandidates(position, [...freeAgents, ...teamPlayers]);
            let lastOwnedRank = 0;
            combined.forEach((c, i) => {
              if (ownedIds.has(c.playerId)) lastOwnedRank = i + 1;
            });
            rows = combined.slice(0, Math.max(5, lastOwnedRank));
          }

          return (
            <section key={position} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
                <PositionTag position={position} /> {position}
              </h2>
              {rows.length === 0 ? (
                <EmptyState>No eligible free agents yet.</EmptyState>
              ) : (
                <TableShell>
                  <thead>
                    <tr className="border-b border-border">
                      <th className={th}>#</th>
                      <th className={th}>Player</th>
                      <th className={th}>Team</th>
                      <th className={th}>GP</th>
                      <th className={th}>Trimmed Avg</th>
                      <th className={th}>Std Dev</th>
                      {volumeStat && <th className={th}>{volumeStat.label}</th>}
                      <th className={th}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p, i) => {
                      const owned = ownedIds.has(p.playerId);
                      return (
                        <tr key={p.playerId} className={`${tr} ${owned ? "bg-accent/5" : ""}`}>
                          <td className={`${td} text-muted`}>{i + 1}</td>
                          <td className={td}>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/players/${p.playerId}`}
                                className="font-medium hover:text-accent"
                              >
                                {p.name}
                              </Link>
                              {owned && (
                                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                  {compareTeam?.name}
                                </span>
                              )}
                              {p.injuryStatus && <InjuryBadge status={p.injuryStatus} />}
                            </div>
                          </td>
                          <td className={`${td} text-muted`}>{p.team ?? "—"}</td>
                          <td className={td}>{p.gp}</td>
                          <td className={`${td} font-semibold text-accent`}>
                            {p.trimmedMean.toFixed(1)}
                          </td>
                          <td className={`${td} text-muted`}>{p.stdDev.toFixed(1)}</td>
                          {volumeStat && <td className={td}>{p.volume ?? 0}</td>}
                          <td className={`${td} text-muted`}>{p.compositeScore.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableShell>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}
