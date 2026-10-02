import { prisma } from "@/lib/prisma";
import { historicalScore } from "@/lib/historical-results";
import { matchupsForWeek } from "@/lib/schedule";

export type TeamRecord = {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
};

export type StandingsHistory = {
  final: Map<string, TeamRecord>;
  /** teamId -> rank after each week, index 0 = week 1's rank, through `throughWeek`. */
  ranksByWeek: Map<string, number[]>;
};

// Most wins first, points-for as the tiebreak — same ordering used for the
// main standings table and every weekly snapshot below it.
function byStanding(a: TeamRecord, b: TeamRecord): number {
  if (b.wins !== a.wins) return b.wins - a.wins;
  return b.pointsFor - a.pointsFor;
}

// Standings only ever use ACTUAL points (never projections) — a week that
// hasn't been played yet just doesn't count, rather than being guessed at.
// Note this applies every team's *current* roster slots retroactively to
// past weeks, since the app doesn't keep a history of who started when.
//
// Computes the cumulative record through each week in one pass (rather than
// recomputing from scratch per week), snapshotting the standing order after
// each week so the "ranking over time" table doesn't need N separate passes.
export async function computeStandingsHistory(
  season: number,
  seasonType: string,
  throughWeek: number,
): Promise<StandingsHistory> {
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
  const ranksByWeek = new Map<string, number[]>(teams.map((t) => [t.id, []]));

  for (let week = 1; week <= throughWeek; week++) {
    for (const [nameA, nameB] of matchupsForWeek(week)) {
      const teamAId = teamByName.get(nameA.toLowerCase());
      const teamBId = teamByName.get(nameB.toLowerCase());
      if (!teamAId || !teamBId) continue;

      const scoreA = historicalScore(week, nameA) ?? scores.get(teamAId)?.get(week) ?? 0;
      const scoreB = historicalScore(week, nameB) ?? scores.get(teamBId)?.get(week) ?? 0;
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

    const standingOrder = [...records.values()].sort(byStanding);
    standingOrder.forEach((record, i) => ranksByWeek.get(record.teamId)!.push(i + 1));
  }

  return { final: records, ranksByWeek };
}

export async function computeStandings(
  season: number,
  seasonType: string,
  throughWeek: number,
): Promise<Map<string, TeamRecord>> {
  return (await computeStandingsHistory(season, seasonType, throughWeek)).final;
}
