// Ranks free agents within a position by a composite of three signals:
// trimmed-mean scoring (typical week, outliers removed), consistency
// (inverse of standard deviation), and — where we have one — the
// position's most predictive volume stat (targets for WR/TE, carries for
// RB, attempts for QB). Volume matters because it's the leading indicator
// of *future* value: a player getting more touches/targets is more likely
// to keep producing than one who got lucky in garbage time.
//
// Each signal lives on a different scale (points vs. targets vs. a
// standard deviation), so they're standardized to z-scores within the
// candidate pool before combining — the standard way to build a composite
// index out of heterogeneous stats.
export type Candidate = {
  playerId: string;
  name: string;
  team: string | null;
  injuryStatus: string | null;
  gp: number;
  trimmedMean: number;
  stdDev: number;
  volume: number | null;
};

export type RankedCandidate = Candidate & { compositeScore: number };

// K and DEF don't have a reliable "opportunity" stat synced yet (field goal
// attempts / sacks live only in the raw per-week JSON blob, not pulled out
// as columns), so those two positions skip the volume term entirely rather
// than guess at an unverified field.
export const VOLUME_STAT: Partial<Record<string, { key: "passAtt" | "rushAtt" | "targets"; label: string }>> = {
  QB: { key: "passAtt", label: "Pass Att" },
  RB: { key: "rushAtt", label: "Carries" },
  WR: { key: "targets", label: "Targets" },
  TE: { key: "targets", label: "Targets" },
};

const MIN_GAMES = 3; // trimmed mean needs at least 3 to drop a high and low and have anything left

function zScores(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  if (sd === 0) return values.map(() => 0);
  return values.map((v) => (v - mean) / sd);
}

// Trimmed mean 50%, consistency 20%, volume 30% when a volume stat exists;
// redistributed to 70/30 (trimmed mean/consistency) for K and DEF. Scores and
// sorts the whole pool without truncating — callers decide how many rows to
// show (e.g. always 5, or more to fit a rostered player who ranks lower).
export function scoreCandidates(position: string, candidates: Candidate[]): RankedCandidate[] {
  const eligible = candidates.filter((c) => c.gp >= MIN_GAMES);
  if (eligible.length === 0) return [];

  const hasVolume = !!VOLUME_STAT[position];
  const zTrimmed = zScores(eligible.map((c) => c.trimmedMean));
  const zStdDev = zScores(eligible.map((c) => c.stdDev));
  const zVolume = hasVolume ? zScores(eligible.map((c) => c.volume ?? 0)) : eligible.map(() => 0);

  const wTrimmed = hasVolume ? 0.5 : 0.7;
  const wConsistency = hasVolume ? 0.2 : 0.3;
  const wVolume = hasVolume ? 0.3 : 0;

  return eligible
    .map((c, i) => ({
      ...c,
      // Subtracting the stddev z-score rewards consistency (lower volatility).
      compositeScore: wTrimmed * zTrimmed[i] - wConsistency * zStdDev[i] + wVolume * zVolume[i],
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

export function rankBestAvailable(
  position: string,
  candidates: Candidate[],
  limit = 5,
): RankedCandidate[] {
  return scoreCandidates(position, candidates).slice(0, limit);
}
