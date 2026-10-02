// This league's 6-team schedule: a full round robin takes 5 weeks (every team
// plays every other team once), and that 5-week cycle repeats for the rest of
// the 14-week season. Teams are identified by their Team.name (case-insensitive).
export const SEASON_WEEKS = 14;

type Pairing = readonly [string, string];

// Weeks 1-5. Week w > 5 reuses cycle[(w - 1) % 5] — e.g. week 14 reuses
// week 4's pairings (Barclay vs. Julia), which is what makes Julia Barclay's
// week-14 opponent.
const CYCLE: readonly Pairing[][] = [
  [
    ["Barclay", "Sean"],
    ["Julia", "Grace"],
    ["Katie", "Sophie"],
  ],
  [
    ["Barclay", "Sophie"],
    ["Katie", "Julia"],
    ["Grace", "Sean"],
  ],
  [
    ["Barclay", "Katie"],
    ["Julia", "Sean"],
    ["Sophie", "Grace"],
  ],
  [
    ["Barclay", "Julia"],
    ["Sophie", "Sean"],
    ["Katie", "Grace"],
  ],
  [
    ["Barclay", "Grace"],
    ["Katie", "Sean"],
    ["Sophie", "Julia"],
  ],
];

export function matchupsForWeek(week: number): readonly Pairing[] {
  if (week < 1 || week > SEASON_WEEKS) return [];
  return CYCLE[(week - 1) % CYCLE.length];
}

export function fullSchedule(): { week: number; pairs: readonly Pairing[] }[] {
  return Array.from({ length: SEASON_WEEKS }, (_, i) => ({
    week: i + 1,
    pairs: matchupsForWeek(i + 1),
  }));
}
