import { prisma } from "@/lib/prisma";
import { ROSTER_SLOTS, SLOT_ORDER } from "@/lib/roster-slots";

export type PlayerLine = {
  id: string;
  name: string;
  position: string | null;
  nflTeam: string | null;
  rosterSlot: string;
  opponent: string | null;
  /** Null until the player's game is in/final. */
  actualPoints: number | null;
  /** Pregame projection — null only if Sleeper never had one synced for this week. */
  projectedPoints: number | null;
};

export type TeamWeekScore = {
  /** Actual points for starters who've played + projected points for starters who haven't. */
  total: number;
  /** Actual-only total (0 for anyone who hasn't played) — what standings use. */
  actualOnly: number;
  /** Sum of every starter's pregame projection, regardless of whether they've played. */
  projectedTotal: number;
  startersTotal: number;
  startersPlayed: number;
  /** Combined uncertainty left in `total`, for the win-probability model below. */
  stdDev: number;
  players: PlayerLine[];
};

// Rough per-player weekly fantasy-point standard deviation. There's no real
// variance model behind this — it's a reasonable constant (~7 pts is in the
// ballpark for a typical skill-position starter) used only to make win
// probability shrink toward 100/0 as fewer starters are left to play.
const PER_PLAYER_STD_DEV = 7;

const EMPTY: TeamWeekScore = {
  total: 0,
  actualOnly: 0,
  projectedTotal: 0,
  startersTotal: 0,
  startersPlayed: 0,
  stdDev: 0,
  players: [],
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
    select: { id: true, fullName: true, position: true, nflTeam: true, rosterSlot: true },
  });
  if (starters.length === 0) return EMPTY;
  const ids = starters.map((p) => p.id);

  const [statLines, projections] = await Promise.all([
    prisma.playerStatLine.findMany({
      where: { playerId: { in: ids }, season, week, seasonType },
      select: { playerId: true, ptsPpr: true, opponent: true },
    }),
    prisma.playerProjection.findMany({
      where: { playerId: { in: ids }, season, week, seasonType },
      select: { playerId: true, ptsPpr: true, opponent: true },
    }),
  ]);
  const actualByPlayer = new Map(statLines.map((s) => [s.playerId, s]));
  const projByPlayer = new Map(projections.map((p) => [p.playerId, p]));

  let total = 0;
  let actualOnly = 0;
  let projectedTotal = 0;
  let played = 0;
  let remaining = 0;
  const players: PlayerLine[] = starters
    .map((p) => {
      const actual = actualByPlayer.get(p.id);
      const proj = projByPlayer.get(p.id);
      const actualPoints = actual ? (actual.ptsPpr ?? 0) : null;
      const projectedPoints = proj ? (proj.ptsPpr ?? 0) : null;

      total += actualPoints ?? projectedPoints ?? 0;
      projectedTotal += projectedPoints ?? 0;
      if (actual) {
        actualOnly += actualPoints ?? 0;
        played += 1;
      } else {
        remaining += 1;
      }

      return {
        id: p.id,
        name: p.fullName ?? p.id,
        position: p.position,
        nflTeam: p.nflTeam,
        rosterSlot: p.rosterSlot,
        opponent: actual?.opponent ?? proj?.opponent ?? null,
        actualPoints,
        projectedPoints,
      };
    })
    .sort(
      (a, b) =>
        SLOT_ORDER.indexOf(a.rosterSlot) - SLOT_ORDER.indexOf(b.rosterSlot) ||
        a.name.localeCompare(b.name),
    );

  return {
    total,
    actualOnly,
    projectedTotal,
    startersTotal: ids.length,
    startersPlayed: played,
    stdDev: PER_PLAYER_STD_DEV * Math.sqrt(remaining),
    players,
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

export type PairedRow = {
  slotKey: string;
  slotLabel: string;
  slotColor: string;
  left: PlayerLine | null;
  right: PlayerLine | null;
};

// Lines both teams up position-by-position (QB vs QB, the two RBs vs the two
// RBs, ...) for the side-by-side matchup view — same idea as Sleeper's own
// "Starters" list. A slot with nobody assigned on either side is skipped;
// one with a player on only one side still gets a row, with the other side
// blank, so a gap in your lineup is visible rather than silently dropped.
export function pairStarters(left: PlayerLine[], right: PlayerLine[]): PairedRow[] {
  const rows: PairedRow[] = [];
  for (const slot of ROSTER_SLOTS) {
    if (slot.key === "BN") continue;
    const leftGroup = left.filter((p) => p.rosterSlot === slot.key);
    const rightGroup = right.filter((p) => p.rosterSlot === slot.key);
    const count = Math.max(leftGroup.length, rightGroup.length);
    for (let i = 0; i < count; i++) {
      rows.push({
        slotKey: slot.key,
        slotLabel: slot.label,
        slotColor: slot.color,
        left: leftGroup[i] ?? null,
        right: rightGroup[i] ?? null,
      });
    }
  }
  return rows;
}
