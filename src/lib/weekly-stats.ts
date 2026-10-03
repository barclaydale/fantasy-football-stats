// Sample standard deviation (n-1 denominator — standard for treating a
// season's games as a sample rather than the full population) of a player's
// week-to-week PPR scoring. Needs at least 2 games to mean anything.
export function sampleStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Trimmed mean: average after dropping the single highest and single lowest
// value — the same technique Olympic judging uses to drop high/low scores
// before averaging. Needs at least 3 games, or there's nothing left to average.
export function trimmedMean(values: number[]): number | null {
  if (values.length < 3) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
}
