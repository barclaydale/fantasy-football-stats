// Neither Sleeper endpoint carries real kickoff times — their stats and
// projections payloads only have a bare date (e.g. "2025-10-02"), no time of
// day. ESPN's free, public scoreboard API (undocumented but widely used, no
// key) is the actual schedule source: real kickoff date/time, home/away.
//
// Sleeper and ESPN use the same team abbreviations except Washington:
// Sleeper's "WAS" is ESPN's "WSH".
const ESPN_TO_SLEEPER: Record<string, string> = { WSH: "WAS" };

export type TeamKickoff = {
  kickoff: Date;
  opponent: string; // Sleeper-style abbreviation
  homeAway: "home" | "away";
};

type EspnCompetitor = { team?: { abbreviation?: string }; homeAway?: string };
type EspnCompetition = { date?: string; competitors?: EspnCompetitor[] };
type EspnEvent = { date?: string; competitions?: EspnCompetition[] };
type EspnScoreboard = { events?: EspnEvent[] };

// Returns a map keyed by Sleeper-style team abbreviation -> that team's
// kickoff this week. Cached for an hour (schedule times rarely change
// mid-week) rather than refetched on every page view.
export async function getWeekKickoffs(
  season: number,
  week: number,
  seasonType: string,
): Promise<Map<string, TeamKickoff>> {
  const espnSeasonType = seasonType === "post" ? 3 : seasonType === "pre" ? 1 : 2;
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=${espnSeasonType}&week=${week}&year=${season}`;

  const map = new Map<string, TeamKickoff>();
  let data: EspnScoreboard;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return map;
    data = (await res.json()) as EspnScoreboard;
  } catch {
    return map;
  }

  for (const event of data.events ?? []) {
    const competition = event.competitions?.[0];
    const kickoffRaw = competition?.date ?? event.date;
    if (!competition || !kickoffRaw) continue;
    const kickoff = new Date(kickoffRaw);
    const competitors = competition.competitors ?? [];

    for (const team of competitors) {
      const espnAbbr = team.team?.abbreviation;
      if (!espnAbbr) continue;
      const opponent = competitors.find((c) => c !== team);
      const opponentEspnAbbr = opponent?.team?.abbreviation;

      map.set(ESPN_TO_SLEEPER[espnAbbr] ?? espnAbbr, {
        kickoff,
        opponent: opponentEspnAbbr ? (ESPN_TO_SLEEPER[opponentEspnAbbr] ?? opponentEspnAbbr) : "",
        homeAway: team.homeAway === "home" ? "home" : "away",
      });
    }
  }

  return map;
}

export function formatKickoff(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
