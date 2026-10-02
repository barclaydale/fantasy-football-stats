import { prisma } from "@/lib/prisma";

export type TeamWeekScore = {
  /** Actual points for starters who've played + projected points for starters who haven't. */
  total: number;
  /** Actual-only total (0 for anyone who hasn't played) — what standings use. */
  actualOnly: number;
  startersTotal: number;
  startersPlayed: number;
  /** Combined uncertainty left in `total`, for the win-probability model below. */
  stdDev: number;
};

// Rough per-player weekly fantasy-point standard deviation. There's no real
// variance model behind this — it's a reasonable constant (~7 pts is in the
// ballpark for a typical skill-position starter) used only to make win
// probability shrink toward 100/0 as fewer starters are left to play.
const PER_PLAYER_STD_DEV = 7;

const EMPTY: TeamWeekScore = {
  total: 0,
  actualOnly: 0,
  startersTotal: 0,
  startersPlayed: 0,
  stdDev: 0,
};

export async function computeTeamWeekScore(
  teamId: string | null | undefined,
  season: number,
  week: number,
  seasonType: string,
): Promise<TeamWeekScore> {
  if (!teamId) return EMPTY;

  const starters = await prisma.player.findMany({
    where: { fantasyTeamId: teamId, rosterSlot: { not: "BN" } },
    select: { id: true },
  });
  const ids = starters.map((p) => p.id);
  if (ids.length === 0) return EMPTY;

  const [statLines, projections] = await Promise.all([
    prisma.playerStatLine.findMany({
      where: { playerId: { in: ids }, season, week, seasonType },
      select: { playerId: true, ptsPpr: true },
    }),
    prisma.playerProjection.findMany({
      where: { playerId: { in: ids }, season, week, seasonType },
      select: { playerId: true, ptsPpr: true },
    }),
  ]);
  const actualByPlayer = new Map(statLines.map((s) => [s.playerId, s.ptsPpr ?? 0]));
  const projByPlayer = new Map(projections.map((p) => [p.playerId, p.ptsPpr ?? 0]));

  let total = 0;
  let actualOnly = 0;
  let played = 0;
  let remaining = 0;
  for (const id of ids) {
    const actual = actualByPlayer.get(id);
    if (actual != null) {
      total += actual;
      actualOnly += actual;
      played += 1;
    } else {
      total += projByPlayer.get(id) ?? 0;
      remaining += 1;
    }
  }

  return {
    total,
    actualOnly,
    startersTotal: ids.length,
    startersPlayed: played,
    stdDev: PER_PLAYER_STD_DEV * Math.sqrt(remaining),
  };
}

// Abramowitz & Stegun error-function approximation (good to ~1e-7) — the
// standard library has no erf/normal-CDF, and this avoids a dependency for
// one function.
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// P(team A's final score beats team B's), modeling each team's remaining
// uncertainty as independent normals and reading off the CDF of the
// difference. Degenerates to 100/0 (or 50/50 on a tie) once both teams are
// fully done, matching the "it's just the final score" case.
export function winProbability(a: TeamWeekScore, b: TeamWeekScore): number {
  const diff = a.total - b.total;
  const sd = Math.sqrt(a.stdDev ** 2 + b.stdDev ** 2);
  if (sd === 0) return diff > 0 ? 1 : diff < 0 ? 0 : 0.5;
  return normalCdf(diff / sd);
}
