import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackLink, Card, EmptyState, InjuryBadge, PositionTag, TableShell, td, th, tr } from "../../ui";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface-hover px-4 py-3">
      <dt className="text-xs tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold">{value}</dd>
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <BackLink href="/stats">Stats</BackLink>

      <div>
        <h1 className="text-2xl font-semibold">{player.fullName ?? player.id}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>
            <PositionTag position={player.position} /> · {player.nflTeam ?? "Free agent"}
          </span>
          {player.injuryStatus && (
            <InjuryBadge status={player.injuryStatus} bodyPart={player.injuryBodyPart} />
          )}
        </p>
      </div>

      {season && gp > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-muted">
            Season {season} totals · {gp} {gp === 1 ? "game" : "games"}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="PPR pts" value={ptsPpr.toFixed(1)} />
            <StatTile label="Pts/G" value={gp ? (ptsPpr / gp).toFixed(1) : "—"} />
            {snapPct != null && <StatTile label="Snap %" value={`${snapPct.toFixed(0)}%`} />}
            {!!seasonTotals?._sum.rec && (
              <StatTile label="Receptions" value={seasonTotals._sum.rec} />
            )}
            {!!seasonTotals?._sum.recYards && (
              <StatTile label="Rec yards" value={seasonTotals._sum.recYards} />
            )}
            {!!seasonTotals?._sum.rushYards && (
              <StatTile label="Rush yards" value={seasonTotals._sum.rushYards} />
            )}
            {!!seasonTotals?._sum.passYards && (
              <StatTile label="Pass yards" value={seasonTotals._sum.passYards} />
            )}
            {!!seasonTotals?._sum.passTds && (
              <StatTile label="Pass TDs" value={seasonTotals._sum.passTds} />
            )}
          </dl>
        </Card>
      )}

      {projection && (
        <Card>
          <h2 className="text-sm font-medium text-muted">
            Week {projection.week} projection
            {projection.opponent ? ` vs ${projection.opponent}` : ""}
          </h2>
          <p className="mt-2 text-lg font-semibold text-accent">
            {projection.ptsPpr?.toFixed(1) ?? "—"} <span className="text-sm font-normal text-muted">PPR pts projected</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {[
              projection.recYards ? `${projection.recYards.toFixed(0)} rec yd` : null,
              projection.rushYards ? `${projection.rushYards.toFixed(0)} rush yd` : null,
              projection.passYards ? `${projection.passYards.toFixed(0)} pass yd` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">Game log</h2>
        {statLines.length === 0 ? (
          <EmptyState>No games recorded yet this season.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Wk</th>
                <th className={th}>Opp</th>
                <th className={th}>Pts</th>
                <th className={th}>Snap %</th>
                <th className={th}>Rec</th>
                <th className={th}>Rec Yd</th>
                <th className={th}>Rush Yd</th>
                <th className={th}>Pass Yd</th>
              </tr>
            </thead>
            <tbody>
              {statLines.map((line) => {
                const lineSnapPct =
                  line.offSnaps != null && line.teamOffSnaps
                    ? (line.offSnaps / line.teamOffSnaps) * 100
                    : null;
                return (
                  <tr key={line.id} className={tr}>
                    <td className={td}>{line.week}</td>
                    <td className={`${td} text-muted`}>{line.opponent ?? "—"}</td>
                    <td className={`${td} font-semibold text-accent`}>
                      {line.ptsPpr?.toFixed(1) ?? "—"}
                    </td>
                    <td className={td}>
                      {lineSnapPct != null ? `${lineSnapPct.toFixed(0)}%` : "—"}
                    </td>
                    <td className={td}>{line.rec ?? "—"}</td>
                    <td className={td}>{line.recYards ?? "—"}</td>
                    <td className={td}>{line.rushYards ?? "—"}</td>
                    <td className={td}>{line.passYards ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </section>
    </main>
  );
}
