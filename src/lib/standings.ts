import { prisma } from "@/lib/prisma";
import { matchupsForWeek } from "@/lib/schedule";

export type TeamRecord = {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
};

// Standings only ever use ACTUAL points (never projections) — a week that
// hasn't been played yet just doesn't count, rather than being guessed at.
// Note this applies every team's *current* roster slots retroactively to
// past weeks, since the app doesn't keep a history of who started when.
export async function computeStandings(
  season: number,
  seasonType: string,
  throughWeek: number,
): Promise<Map<string, TeamRecord>> {
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t.id]));

  const starters = await prisma.player.findMany({
    where: { fantasyTeamId: { not: null }, rosterSlot: { not: "BN" } },
    select: { id: true, fantasyTeamId: true },
  });
  const teamByPlayer = new Map(starters.map((p) => [p.id, p.fantasyTeamId as string]));
  const starterIds = starters.map((p) => p.id);

  const statLines = starterIds.length
    ? await prisma.playerStatLine.findMany({
        where: {
          playerId: { in: starterIds },
          season,
          seasonType,
          week: { lte: throughWeek },
        },
        select: { playerId: true, week: true, ptsPpr: true },
      })
    : [];

  // teamId -> week -> points
  const scores = new Map<string, Map<number, number>>();
  for (const line of statLines) {
    const teamId = teamByPlayer.get(line.playerId);
    if (!teamId) continue;
    const weekMap = scores.get(teamId) ?? new Map<number, number>();
    weekMap.set(line.week, (weekMap.get(line.week) ?? 0) + (line.ptsPpr ?? 0));
    scores.set(teamId, weekMap);
  }

  const records = new Map<string, TeamRecord>(
    teams.map((t) => [t.id, { teamId: t.id, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }]),
  );

  for (let week = 1; week <= throughWeek; week++) {
    for (const [nameA, nameB] of matchupsForWeek(week)) {
      const teamAId = teamByName.get(nameA.toLowerCase());
      const teamBId = teamByName.get(nameB.toLowerCase());
      if (!teamAId || !teamBId) continue;

      const scoreA = scores.get(teamAId)?.get(week) ?? 0;
      const scoreB = scores.get(teamBId)?.get(week) ?? 0;
      const recordA = records.get(teamAId)!;
      const recordB = records.get(teamBId)!;

      recordA.pointsFor += scoreA;
      recordA.pointsAgainst += scoreB;
      recordB.pointsFor += scoreB;
      recordB.pointsAgainst += scoreA;

      if (scoreA > scoreB) {
        recordA.wins += 1;
        recordB.losses += 1;
      } else if (scoreB > scoreA) {
        recordB.wins += 1;
        recordA.losses += 1;
      } else {
        recordA.ties += 1;
        recordB.ties += 1;
      }
    }
  }

  return records;
}
