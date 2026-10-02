import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackLink, EmptyState, InjuryBadge, TableShell, td, th, tr } from "../ui";

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;
type Position = (typeof POSITIONS)[number];

function isPosition(value: string | undefined): value is Position {
  return !!value && (POSITIONS as readonly string[]).includes(value);
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ position?: string }>;
}) {
  const { position: rawPosition } = await searchParams;
  const position: Position = isPosition(rawPosition) ? rawPosition : "QB";

  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });
  const season = syncState?.season;

  const totals = season
    ? await prisma.playerStatLine.groupBy({
        by: ["playerId"],
        where: { season, seasonType: "regular", player: { position } },
        _sum: {
          ptsPpr: true,
          rec: true,
          recYards: true,
          recTds: true,
          rushAtt: true,
          rushYards: true,
          rushTds: true,
          passAtt: true,
          passCmp: true,
          passYards: true,
          passTds: true,
          passInt: true,
          offSnaps: true,
          teamOffSnaps: true,
        },
        _count: { _all: true },
        having: { ptsPpr: { _sum: { gt: 0 } } },
        orderBy: { _sum: { ptsPpr: "desc" } },
        take: 100,
      })
    : [];

  const playerIds = totals.map((t) => t.playerId);
  const players = playerIds.length
    ? await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, fullName: true, nflTeam: true, injuryStatus: true },
      })
    : [];
  const playerById = new Map(players.map((p) => [p.id, p]));

  const showReceiving = position === "WR" || position === "TE" || position === "RB";
  const showRushing = position === "RB" || position === "QB";
  const showPassing = position === "QB";
  const showSnaps = position !== "DEF" && position !== "K";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <BackLink href="/">Teams</BackLink>
        <h1 className="text-xl font-semibold">Season Stats{season ? ` — ${season}` : ""}</h1>
      </div>

      <nav className="flex flex-wrap gap-2">
        {POSITIONS.map((pos) => (
          <Link
            key={pos}
            href={`/stats?position=${pos}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              pos === position
                ? "bg-accent text-accent-foreground"
                : "border border-border text-muted hover:border-accent hover:text-foreground"
            }`}
          >
            {pos}
          </Link>
        ))}
      </nav>

      {!season ? (
        <EmptyState>No synced data yet — run a sync from the home page.</EmptyState>
      ) : totals.length === 0 ? (
        <EmptyState>No stats yet for this position.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Player</th>
              <th className={th}>Team</th>
              <th className={th}>GP</th>
              <th className={th}>PPR pts</th>
              <th className={th}>Pts/G</th>
              {showReceiving && (
                <>
                  <th className={th}>Rec</th>
                  <th className={th}>Rec Yd</th>
                  <th className={th}>Rec TD</th>
                </>
              )}
              {showRushing && (
                <>
                  <th className={th}>Rush Att</th>
                  <th className={th}>Rush Yd</th>
                  <th className={th}>Rush TD</th>
                </>
              )}
              {showPassing && (
                <>
                  <th className={th}>Cmp/Att</th>
                  <th className={th}>Pass Yd</th>
                  <th className={th}>Pass TD</th>
                  <th className={th}>Int</th>
                </>
              )}
              {showSnaps && <th className={th}>Snap %</th>}
            </tr>
          </thead>
          <tbody>
            {totals.map((t) => {
              const player = playerById.get(t.playerId);
              const gp = t._count._all;
              const ptsPpr = t._sum.ptsPpr ?? 0;
              const snapPct =
                t._sum.offSnaps != null && t._sum.teamOffSnaps
                  ? (t._sum.offSnaps / t._sum.teamOffSnaps) * 100
                  : null;
              return (
                <tr key={t.playerId} className={tr}>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/players/${t.playerId}`}
                        className="font-medium hover:text-accent"
                      >
                        {player?.fullName ?? t.playerId}
                      </Link>
                      {player?.injuryStatus && <InjuryBadge status={player.injuryStatus} />}
                    </div>
                  </td>
                  <td className={`${td} text-muted`}>{player?.nflTeam ?? "—"}</td>
                  <td className={td}>{gp}</td>
                  <td className={`${td} font-semibold text-accent`}>{ptsPpr.toFixed(1)}</td>
                  <td className={td}>{gp ? (ptsPpr / gp).toFixed(1) : "—"}</td>
                  {showReceiving && (
                    <>
                      <td className={td}>{t._sum.rec ?? 0}</td>
                      <td className={td}>{t._sum.recYards ?? 0}</td>
                      <td className={td}>{t._sum.recTds ?? 0}</td>
                    </>
                  )}
                  {showRushing && (
                    <>
                      <td className={td}>{t._sum.rushAtt ?? 0}</td>
                      <td className={td}>{t._sum.rushYards ?? 0}</td>
                      <td className={td}>{t._sum.rushTds ?? 0}</td>
                    </>
                  )}
                  {showPassing && (
                    <>
                      <td className={td}>
                        {t._sum.passCmp ?? 0}/{t._sum.passAtt ?? 0}
                      </td>
                      <td className={td}>{t._sum.passYards ?? 0}</td>
                      <td className={td}>{t._sum.passTds ?? 0}</td>
                      <td className={td}>{t._sum.passInt ?? 0}</td>
                    </>
                  )}
                  {showSnaps && (
                    <td className={td}>{snapPct != null ? `${snapPct.toFixed(0)}%` : "—"}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </main>
  );
}
