import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div>
        <Link href="/" className="text-sm text-gray-500">
          ← Back
        </Link>
        <h1 className="text-3xl font-semibold">Season Stats{season ? ` — ${season}` : ""}</h1>
      </div>

      <nav className="flex flex-wrap gap-2">
        {POSITIONS.map((pos) => (
          <Link
            key={pos}
            href={`/stats?position=${pos}`}
            className={`rounded px-3 py-1 text-sm ${
              pos === position
                ? "bg-foreground text-background"
                : "border border-gray-300 text-gray-700"
            }`}
          >
            {pos}
          </Link>
        ))}
      </nav>

      {!season ? (
        <p className="text-sm text-gray-400">No synced data yet — run a sync from the home page.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4">Player</th>
                <th className="py-2 pr-4">Team</th>
                <th className="py-2 pr-4">GP</th>
                <th className="py-2 pr-4">PPR pts</th>
                <th className="py-2 pr-4">Pts/G</th>
                {showReceiving && (
                  <>
                    <th className="py-2 pr-4">Rec</th>
                    <th className="py-2 pr-4">Rec Yd</th>
                    <th className="py-2 pr-4">Rec TD</th>
                  </>
                )}
                {showRushing && (
                  <>
                    <th className="py-2 pr-4">Rush Att</th>
                    <th className="py-2 pr-4">Rush Yd</th>
                    <th className="py-2 pr-4">Rush TD</th>
                  </>
                )}
                {showPassing && (
                  <>
                    <th className="py-2 pr-4">Cmp/Att</th>
                    <th className="py-2 pr-4">Pass Yd</th>
                    <th className="py-2 pr-4">Pass TD</th>
                    <th className="py-2 pr-4">Int</th>
                  </>
                )}
                {showSnaps && <th className="py-2 pr-4">Snap %</th>}
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
                  <tr key={t.playerId} className="border-b border-gray-100">
                    <td className="py-2 pr-4">
                      <Link href={`/players/${t.playerId}`} className="hover:underline">
                        {player?.fullName ?? t.playerId}
                      </Link>
                      {player?.injuryStatus && (
                        <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                          {player.injuryStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{player?.nflTeam ?? "—"}</td>
                    <td className="py-2 pr-4">{gp}</td>
                    <td className="py-2 pr-4 font-medium">{ptsPpr.toFixed(1)}</td>
                    <td className="py-2 pr-4">{gp ? (ptsPpr / gp).toFixed(1) : "—"}</td>
                    {showReceiving && (
                      <>
                        <td className="py-2 pr-4">{t._sum.rec ?? 0}</td>
                        <td className="py-2 pr-4">{t._sum.recYards ?? 0}</td>
                        <td className="py-2 pr-4">{t._sum.recTds ?? 0}</td>
                      </>
                    )}
                    {showRushing && (
                      <>
                        <td className="py-2 pr-4">{t._sum.rushAtt ?? 0}</td>
                        <td className="py-2 pr-4">{t._sum.rushYards ?? 0}</td>
                        <td className="py-2 pr-4">{t._sum.rushTds ?? 0}</td>
                      </>
                    )}
                    {showPassing && (
                      <>
                        <td className="py-2 pr-4">
                          {t._sum.passCmp ?? 0}/{t._sum.passAtt ?? 0}
                        </td>
                        <td className="py-2 pr-4">{t._sum.passYards ?? 0}</td>
                        <td className="py-2 pr-4">{t._sum.passTds ?? 0}</td>
                        <td className="py-2 pr-4">{t._sum.passInt ?? 0}</td>
                      </>
                    )}
                    {showSnaps && (
                      <td className="py-2 pr-4">
                        {snapPct != null ? `${snapPct.toFixed(0)}%` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
              {totals.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-4 text-gray-400">
                    No stats yet for this position.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
