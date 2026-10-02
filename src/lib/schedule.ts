// This league's 6-team schedule: a full round robin takes 5 weeks (every team
// plays every other team once), and that 5-week cycle repeats for the rest of
// the 14-week season. Teams are identified by Sleeper username — matched
// against Team.ownerName (case-insensitive) when rendering, not by team
// display name, since display names change more often than usernames.
export const SEASON_WEEKS = 14;

type Pairing = readonly [string, string];

// Weeks 1-5. Week w > 5 reuses cycle[(w - 1) % 5] — e.g. week 14 reuses
// week 4's pairings (barclaydale vs. jhavertine), which is what makes
// jhavertine barclaydale's week-14 opponent.
const CYCLE: readonly Pairing[][] = [
  [
    ["barclaydale", "seanmac12"],
    ["jhavertine", "gracewakiyama"],
    ["katiegerber14", "splechner"],
  ],
  [
    ["barclaydale", "splechner"],
    ["katiegerber14", "jhavertine"],
    ["gracewakiyama", "seanmac12"],
  ],
  [
    ["barclaydale", "katiegerber14"],
    ["jhavertine", "seanmac12"],
    ["splechner", "gracewakiyama"],
  ],
  [
    ["barclaydale", "jhavertine"],
    ["splechner", "seanmac12"],
    ["katiegerber14", "gracewakiyama"],
  ],
  [
    ["barclaydale", "gracewakiyama"],
    ["katiegerber14", "seanmac12"],
    ["splechner", "jhavertine"],
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
