import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rankBestAvailable, VOLUME_STAT, type Candidate } from "@/lib/best-available";
import { sampleStdDev, trimmedMean } from "@/lib/weekly-stats";
import { BackLink, EmptyState, InjuryBadge, PositionTag, TableShell, td, th, tr } from "../ui";

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;

export default async function AvailablePage() {
  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });
  const season = syncState?.season;

  const totals = season
    ? await prisma.playerStatLine.groupBy({
        by: ["playerId"],
        where: { season, seasonType: "regular", player: { fantasyTeamId: null } },
        _sum: { ptsPpr: true, recTargets: true, rushAtt: true, passAtt: true },
        _count: { _all: true },
        having: { ptsPpr: { _sum: { gt: 0 } } },
        orderBy: { _sum: { ptsPpr: "desc" } },
        take: 500,
      })
    : [];

  const playerIds = totals.map((t) => t.playerId);
  const [players, weeklyLines] = playerIds.length
    ? await Promise.all([
        prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, fullName: true, position: true, nflTeam: true, injuryStatus: true },
        }),
        prisma.playerStatLine.findMany({
          where: { playerId: { in: playerIds }, season: season!, seasonType: "regular" },
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

  const candidatesByPosition = new Map<string, Candidate[]>();
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

    const list = candidatesByPosition.get(player.position) ?? [];
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
    candidatesByPosition.set(player.position, list);
  }

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

      {!season ? (
        <EmptyState>No synced data yet — run a sync from the home page.</EmptyState>
      ) : (
        POSITIONS.map((position) => {
          const ranked = rankBestAvailable(position, candidatesByPosition.get(position) ?? []);
          const volumeStat = VOLUME_STAT[position];

          return (
            <section key={position} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
                <PositionTag position={position} /> {position}
              </h2>
              {ranked.length === 0 ? (
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
                    {ranked.map((p, i) => (
                      <tr key={p.playerId} className={tr}>
                        <td className={`${td} text-muted`}>{i + 1}</td>
                        <td className={td}>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/players/${p.playerId}`}
                              className="font-medium hover:text-accent"
                            >
                              {p.name}
                            </Link>
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
                    ))}
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
