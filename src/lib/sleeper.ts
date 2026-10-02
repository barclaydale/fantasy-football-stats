// Thin client for Sleeper's APIs. Two different hosts on purpose:
// - api.sleeper.app/v1 is Sleeper's documented, stable public API (players, league state).
// - api.sleeper.com is undocumented (it's what Sleeper's own app calls) but is the only
//   place that still serves weekly stats — Sleeper pulled the stats endpoint from the
//   documented v1 API at their data provider's request. No API key either way.

export type SleeperState = {
  week: number;
  season: string;
  season_type: string;
  display_week: number;
};

export type SleeperPlayer = {
  player_id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  position?: string | null;
  fantasy_positions?: string[] | null;
  team?: string | null;
  status?: string | null;
  injury_status?: string | null;
  injury_body_part?: string | null;
  injury_notes?: string | null;
  age?: number | null;
  years_exp?: number | null;
  depth_chart_position?: string | null;
  depth_chart_order?: number | null;
  search_rank?: number | null;
  active?: boolean | null;
};

// Shared shape for both /stats (actual, "category": "stat") and /projections
// ("category": "proj") responses — same stat keys either way.
export type SleeperStatLine = {
  player_id: string;
  season: string;
  week: number;
  season_type: string;
  team?: string | null;
  opponent?: string | null;
  stats: Record<string, number>;
};

const FANTASY_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Sleeper request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

export function getNflState(): Promise<SleeperState> {
  return fetchJson("https://api.sleeper.app/v1/state/nfl");
}

// ~12,000 players, ~15MB. Sleeper asks that this only be called about once a
// day, which matches our cron cadence anyway.
export function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  return fetchJson("https://api.sleeper.app/v1/players/nfl");
}

export function getWeekStats(
  season: number,
  week: number,
  seasonType = "regular",
): Promise<SleeperStatLine[]> {
  return fetchJson(
    `https://api.sleeper.com/stats/nfl/${season}/${week}?season_type=${seasonType}`,
  );
}

// Unlike /stats, this one requires explicit position[] filters.
export function getWeekProjections(
  season: number,
  week: number,
  seasonType = "regular",
): Promise<SleeperStatLine[]> {
  const params = new URLSearchParams({ season_type: seasonType });
  for (const position of FANTASY_POSITIONS) params.append("position[]", position);
  return fetchJson(
    `https://api.sleeper.com/projections/nfl/${season}/${week}?${params.toString()}`,
  );
}
