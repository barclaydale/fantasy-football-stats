import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackLink, EmptyState, InjuryBadge, TableShell, td, th, tr } from "../ui";

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;
type Position = (typeof POSITIONS)[number];

function isPosition(value: string | undefined): value is Position {
  return !!value && (POSITIONS as readonly string[]).includes(value);
}

type Row = {
  playerId: string;
  name: string;
  team: string | null;
  injuryStatus: string | null;
  gp: number;
  pts: number;
  ppg: number;
  stdDev: number | null;
  trimmedMean: number | null;
  rec: number;
  recYd: number;
  recTd: number;
  rushAtt: number;
  rushYd: number;
  rushTd: number;
  passCmp: number;
  passAtt: number;
  passYd: number;
  passTd: number;
  passInt: number;
  snapPct: number | null;
};

// Sample standard deviation (n-1 denominator — standard for treating a
// season's games as a sample rather than the full population) of a player's
// week-to-week PPR scoring. Needs at least 2 games to mean anything.
function sampleStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Trimmed mean: average after dropping the single highest and single lowest
// value — the same technique Olympic judging uses to drop high/low scores
// before averaging. Needs at least 3 games, or there's nothing left to average.
function trimmedMean(values: number[]): number | null {
  if (values.length < 3) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
}

// Accessor per sortable column, plus which direction makes sense to start
// with when you first click it (names A-Z, everything else biggest-first).
const COLUMNS: Record<string, { get: (r: Row) => number | string; defaultDir: "asc" | "desc" }> = {
  name: { get: (r) => r.name, defaultDir: "asc" },
  team: { get: (r) => r.team ?? "", defaultDir: "asc" },
  gp: { get: (r) => r.gp, defaultDir: "desc" },
  pts: { get: (r) => r.pts, defaultDir: "desc" },
  ppg: { get: (r) => r.ppg, defaultDir: "desc" },
  stdDev: { get: (r) => r.stdDev ?? -1, defaultDir: "desc" },
  trimmedMean: { get: (r) => r.trimmedMean ?? -1, defaultDir: "desc" },
  rec: { get: (r) => r.rec, defaultDir: "desc" },
  recYd: { get: (r) => r.recYd, defaultDir: "desc" },
  recTd: { get: (r) => r.recTd, defaultDir: "desc" },
  rushAtt: { get: (r) => r.rushAtt, defaultDir: "desc" },
  rushYd: { get: (r) => r.rushYd, defaultDir: "desc" },
  rushTd: { get: (r) => r.rushTd, defaultDir: "desc" },
  passCmp: { get: (r) => r.passCmp, defaultDir: "desc" },
  passYd: { get: (r) => r.passYd, defaultDir: "desc" },
  passTd: { get: (r) => r.passTd, defaultDir: "desc" },
  passInt: { get: (r) => r.passInt, defaultDir: "desc" },
  snapPct: { get: (r) => r.snapPct ?? -1, defaultDir: "desc" },
};

function SortableTh({
  column,
  label,
  position,
  sort,
  dir,
}: {
  column: string;
  label: string;
  position: string;
  sort: string;
  dir: "asc" | "desc";
}) {
  const active = sort === column;
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : COLUMNS[column].defaultDir;

  return (
    <th className={th}>
      <Link
        href={`/players?position=${position}&sort=${column}&dir=${nextDir}`}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        {active && <span className="text-accent">{dir === "asc" ? "▲" : "▼"}</span>}
      </Link>
    </th>
  );
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ position?: string; sort?: string; dir?: string }>;
}) {
  const { position: rawPosition, sort: rawSort, dir: rawDir } = await searchParams;
  const position: Position = isPosition(rawPosition) ? rawPosition : "QB";
  const sort = rawSort && COLUMNS[rawSort] ? rawSort : "pts";
  const dir: "asc" | "desc" = rawDir === "asc" ? "asc" : "desc";

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
  const [players, weeklyLines] = playerIds.length
    ? await Promise.all([
        prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, fullName: true, nflTeam: true, injuryStatus: true },
        }),
        prisma.playerStatLine.findMany({
          // playerIds is only non-empty when `season` was truthy above.
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

  const showReceiving = position === "WR" || position === "TE" || position === "RB";
  const showRushing = position === "RB" || position === "QB";
  const showPassing = position === "QB";
  const showSnaps = position !== "DEF" && position !== "K";

  const rows: Row[] = totals.map((t) => {
    const player = playerById.get(t.playerId);
    const gp = t._count._all;
    const pts = t._sum.ptsPpr ?? 0;
    const weeklyPts = weeklyPtsByPlayer.get(t.playerId) ?? [];
    return {
      playerId: t.playerId,
      name: player?.fullName ?? t.playerId,
      team: player?.nflTeam ?? null,
      injuryStatus: player?.injuryStatus ?? null,
      gp,
      pts,
      ppg: gp ? pts / gp : 0,
      stdDev: sampleStdDev(weeklyPts),
      trimmedMean: trimmedMean(weeklyPts),
      rec: t._sum.rec ?? 0,
      recYd: t._sum.recYards ?? 0,
      recTd: t._sum.recTds ?? 0,
      rushAtt: t._sum.rushAtt ?? 0,
      rushYd: t._sum.rushYards ?? 0,
      rushTd: t._sum.rushTds ?? 0,
      passCmp: t._sum.passCmp ?? 0,
      passAtt: t._sum.passAtt ?? 0,
      passYd: t._sum.passYards ?? 0,
      passTd: t._sum.passTds ?? 0,
      passInt: t._sum.passInt ?? 0,
      snapPct:
        t._sum.offSnaps != null && t._sum.teamOffSnaps
          ? (t._sum.offSnaps / t._sum.teamOffSnaps) * 100
          : null,
    };
  });

  const { get } = COLUMNS[sort];
  rows.sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
    return dir === "asc" ? cmp : -cmp;
  });

  const sortableTh = (column: string, label: string) => (
    <SortableTh column={column} label={label} position={position} sort={sort} dir={dir} />
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <BackLink href="/">Teams</BackLink>
        <h1 className="text-xl font-semibold">Players{season ? ` — ${season}` : ""}</h1>
      </div>

      <nav className="flex flex-wrap gap-2">
        {POSITIONS.map((pos) => (
          <Link
            key={pos}
            href={`/players?position=${pos}`}
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
      ) : rows.length === 0 ? (
        <EmptyState>No stats yet for this position.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              {sortableTh("name", "Player")}
              {sortableTh("team", "Team")}
              {sortableTh("gp", "GP")}
              {sortableTh("pts", "PPR pts")}
              {sortableTh("ppg", "Pts/G")}
              {sortableTh("stdDev", "Std Dev")}
              {sortableTh("trimmedMean", "Trimmed Avg")}
              {showReceiving && (
                <>
                  {sortableTh("rec", "Rec")}
                  {sortableTh("recYd", "Rec Yd")}
                  {sortableTh("recTd", "Rec TD")}
                </>
              )}
              {showRushing && (
                <>
                  {sortableTh("rushAtt", "Rush Att")}
                  {sortableTh("rushYd", "Rush Yd")}
                  {sortableTh("rushTd", "Rush TD")}
                </>
              )}
              {showPassing && (
                <>
                  {sortableTh("passCmp", "Cmp/Att")}
                  {sortableTh("passYd", "Pass Yd")}
                  {sortableTh("passTd", "Pass TD")}
                  {sortableTh("passInt", "Int")}
                </>
              )}
              {showSnaps && sortableTh("snapPct", "Snap %")}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.playerId} className={tr}>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <Link href={`/players/${r.playerId}`} className="font-medium hover:text-accent">
                      {r.name}
                    </Link>
                    {r.injuryStatus && <InjuryBadge status={r.injuryStatus} />}
                  </div>
                </td>
                <td className={`${td} text-muted`}>{r.team ?? "—"}</td>
                <td className={td}>{r.gp}</td>
                <td className={`${td} font-semibold text-accent`}>{r.pts.toFixed(1)}</td>
                <td className={td}>{r.gp ? r.ppg.toFixed(1) : "—"}</td>
                <td className={`${td} text-muted`}>{r.stdDev != null ? r.stdDev.toFixed(1) : "—"}</td>
                <td className={`${td} text-muted`}>
                  {r.trimmedMean != null ? r.trimmedMean.toFixed(1) : "—"}
                </td>
                {showReceiving && (
                  <>
                    <td className={td}>{r.rec}</td>
                    <td className={td}>{r.recYd}</td>
                    <td className={td}>{r.recTd}</td>
                  </>
                )}
                {showRushing && (
                  <>
                    <td className={td}>{r.rushAtt}</td>
                    <td className={td}>{r.rushYd}</td>
                    <td className={td}>{r.rushTd}</td>
                  </>
                )}
                {showPassing && (
                  <>
                    <td className={td}>
                      {r.passCmp}/{r.passAtt}
                    </td>
                    <td className={td}>{r.passYd}</td>
                    <td className={td}>{r.passTd}</td>
                    <td className={td}>{r.passInt}</td>
                  </>
                )}
                {showSnaps && (
                  <td className={td}>{r.snapPct != null ? `${r.snapPct.toFixed(0)}%` : "—"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </main>
  );
}
