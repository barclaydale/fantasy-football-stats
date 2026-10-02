import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="text-lg font-medium">{value}</dd>
    </div>
  );
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) notFound();

  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });
  const season = syncState?.season;

  const [statLines, projection, seasonTotals] = await Promise.all([
    season
      ? prisma.playerStatLine.findMany({
          where: { playerId: id, season, seasonType: "regular" },
          orderBy: { week: "asc" },
        })
      : Promise.resolve([]),
    season && syncState?.week
      ? prisma.playerProjection.findUnique({
          where: {
            playerId_season_week_seasonType: {
              playerId: id,
              season,
              week: syncState.week,
              seasonType: syncState.seasonType ?? "regular",
            },
          },
        })
      : Promise.resolve(null),
    season
      ? prisma.playerStatLine.aggregate({
          where: { playerId: id, season, seasonType: "regular" },
          _sum: {
            ptsPpr: true,
            rec: true,
            recYards: true,
            rushYards: true,
            passYards: true,
            passTds: true,
            offSnaps: true,
            teamOffSnaps: true,
          },
          _count: { _all: true },
        })
      : Promise.resolve(null),
  ]);

  const gp = seasonTotals?._count._all ?? 0;
  const ptsPpr = seasonTotals?._sum.ptsPpr ?? 0;
  const snapPct =
    seasonTotals?._sum.offSnaps != null && seasonTotals?._sum.teamOffSnaps
      ? (seasonTotals._sum.offSnaps / seasonTotals._sum.teamOffSnaps) * 100
      : null;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <Link href="/stats" className="text-sm text-muted">
        ← Back to stats
      </Link>

      <div>
        <h1 className="text-3xl font-semibold">{player.fullName ?? player.id}</h1>
        <p className="mt-1 text-sm text-muted">
          {player.position ?? "—"} · {player.nflTeam ?? "Free agent"}
          {player.injuryStatus && (
            <span className="ml-2 rounded bg-danger-bg px-1.5 py-0.5 text-xs text-danger">
              {player.injuryStatus}
              {player.injuryBodyPart ? ` (${player.injuryBodyPart})` : ""}
            </span>
          )}
        </p>
      </div>

      {season && (
        <section className="rounded border border-border bg-surface p-4">
          <h2 className="font-medium">
            Season {season} totals ({gp} {gp === 1 ? "game" : "games"})
          </h2>
          <dl className="mt-3 grid grid-cols-3 gap-4 text-sm sm:grid-cols-4">
            <Stat label="PPR pts" value={ptsPpr.toFixed(1)} />
            <Stat label="Pts/G" value={gp ? (ptsPpr / gp).toFixed(1) : "—"} />
            {snapPct != null && <Stat label="Snap %" value={`${snapPct.toFixed(0)}%`} />}
            {!!seasonTotals?._sum.rec && <Stat label="Receptions" value={seasonTotals._sum.rec} />}
            {!!seasonTotals?._sum.recYards && (
              <Stat label="Rec yards" value={seasonTotals._sum.recYards} />
            )}
            {!!seasonTotals?._sum.rushYards && (
              <Stat label="Rush yards" value={seasonTotals._sum.rushYards} />
            )}
            {!!seasonTotals?._sum.passYards && (
              <Stat label="Pass yards" value={seasonTotals._sum.passYards} />
            )}
            {!!seasonTotals?._sum.passTds && (
              <Stat label="Pass TDs" value={seasonTotals._sum.passTds} />
            )}
          </dl>
        </section>
      )}

      {projection && (
        <section className="rounded border border-border bg-surface p-4">
          <h2 className="font-medium">
            Week {projection.week} projection
            {projection.opponent ? ` vs ${projection.opponent}` : ""}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {projection.ptsPpr?.toFixed(1) ?? "—"} PPR pts projected
            {projection.recYards ? ` · ${projection.recYards.toFixed(0)} rec yd` : ""}
            {projection.rushYards ? ` · ${projection.rushYards.toFixed(0)} rush yd` : ""}
            {projection.passYards ? ` · ${projection.passYards.toFixed(0)} pass yd` : ""}
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-medium">Game log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4">Wk</th>
                <th className="py-2 pr-4">Opp</th>
                <th className="py-2 pr-4">Pts</th>
                <th className="py-2 pr-4">Snap %</th>
                <th className="py-2 pr-4">Rec</th>
                <th className="py-2 pr-4">Rec Yd</th>
                <th className="py-2 pr-4">Rush Yd</th>
                <th className="py-2 pr-4">Pass Yd</th>
              </tr>
            </thead>
            <tbody>
              {statLines.map((line) => {
                const lineSnapPct =
                  line.offSnaps != null && line.teamOffSnaps
                    ? (line.offSnaps / line.teamOffSnaps) * 100
                    : null;
                return (
                  <tr key={line.id} className="border-b border-border">
                    <td className="py-2 pr-4">{line.week}</td>
                    <td className="py-2 pr-4 text-muted">{line.opponent ?? "—"}</td>
                    <td className="py-2 pr-4 font-medium">{line.ptsPpr?.toFixed(1) ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {lineSnapPct != null ? `${lineSnapPct.toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-2 pr-4">{line.rec ?? "—"}</td>
                    <td className="py-2 pr-4">{line.recYards ?? "—"}</td>
                    <td className="py-2 pr-4">{line.rushYards ?? "—"}</td>
                    <td className="py-2 pr-4">{line.passYards ?? "—"}</td>
                  </tr>
                );
              })}
              {statLines.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-muted">
                    No games recorded yet this season.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
