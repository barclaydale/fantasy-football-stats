// Sleeper's public asset CDN — same ecosystem as the API already in use,
// keyed by the player_id we already store as Player.id. Team defenses
// (position "DEF", id = team abbreviation) don't have a player thumbnail,
// but Sleeper does serve team logos, so those use that instead.
export function playerImageUrl(
  playerId: string,
  position: string | null,
  nflTeam: string | null,
): string | null {
  if (position === "DEF") {
    return nflTeam
      ? `https://sleepercdn.com/images/team_logos/nfl/${nflTeam.toLowerCase()}.png`
      : null;
  }
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
}

// "Brock Purdy" -> "B. Purdy", "Amon-Ra St. Brown" -> "A. St. Brown" —
// matches how Sleeper itself abbreviates names in compact lists.
export function shortPlayerName(name: string): string {
  const spaceIndex = name.indexOf(" ");
  if (spaceIndex === -1) return name;
  return `${name[0]}. ${name.slice(spaceIndex + 1)}`;
}
