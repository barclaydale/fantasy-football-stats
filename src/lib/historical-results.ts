// Confirmed final scores for completed weeks, read off real Sleeper matchup
// screenshots (season 2026). Standings use these instead of recomputing from
// synced stats, because this app only tracks each team's *current* roster
// slots — recomputing a past week from today's lineup silently gives the
// wrong answer the moment a lineup has changed since. Once a week here is
// confirmed, it's a fixed historical fact; weeks not listed fall back to the
// app's live computation (season weeks 1-3 verified against the PF/PA shown
// in the real standings: Julia 495.24/384.32, Sophie 466.4/395.12 — both
// matched exactly).
export const HISTORICAL_RESULTS: Record<number, Record<string, number>> = {
  1: { Barclay: 160.56, Sean: 133.32, Julia: 142.16, Grace: 158.46, Katie: 160.06, Sophie: 135.22 },
  2: { Barclay: 129.28, Sophie: 164.76, Katie: 124.6, Julia: 185.92, Grace: 122.04, Sean: 115.72 },
  3: { Barclay: 167.48, Katie: 137.6, Julia: 167.16, Sean: 101.26, Sophie: 166.42, Grace: 105.78 },
};

export function historicalScore(week: number, teamName: string): number | null {
  const weekResults = HISTORICAL_RESULTS[week];
  if (!weekResults) return null;
  const key = Object.keys(weekResults).find((k) => k.toLowerCase() === teamName.toLowerCase());
  return key ? weekResults[key] : null;
}
