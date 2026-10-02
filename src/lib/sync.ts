import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getAllPlayers,
  getNflState,
  getWeekStats,
  type SleeperPlayer,
  type SleeperStatLine,
} from "@/lib/sleeper";

const BATCH_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function upsertPlayers(players: SleeperPlayer[]) {
  for (const batch of chunk(players, BATCH_SIZE)) {
    const rows = batch.map((p) => {
      const joinedName = [p.first_name, p.last_name].filter(Boolean).join(" ");
      const fullName = p.full_name ?? (joinedName || null);
      return Prisma.sql`(
        ${p.player_id}, ${p.first_name ?? null}, ${p.last_name ?? null}, ${fullName},
        ${p.position ?? null}, ${p.fantasy_positions ?? []}::text[], ${p.team ?? null},
        ${p.status ?? null}, ${p.injury_status ?? null}, ${p.injury_body_part ?? null},
        ${p.injury_notes ?? null}, ${p.age ?? null}, ${p.years_exp ?? null},
        ${p.depth_chart_position ?? null}, ${p.depth_chart_order ?? null},
        ${p.search_rank ?? null}, ${p.active ?? true}, NOW()
      )`;
    });

    await prisma.$executeRaw`
      INSERT INTO "Player" (
        "id", "firstName", "lastName", "fullName", "position", "fantasyPositions",
        "nflTeam", "status", "injuryStatus", "injuryBodyPart", "injuryNotes",
        "age", "yearsExp", "depthChartPosition", "depthChartOrder", "searchRank",
        "active", "syncedAt"
      )
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("id") DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "fullName" = EXCLUDED."fullName",
        "position" = EXCLUDED."position",
        "fantasyPositions" = EXCLUDED."fantasyPositions",
        "nflTeam" = EXCLUDED."nflTeam",
        "status" = EXCLUDED."status",
        "injuryStatus" = EXCLUDED."injuryStatus",
        "injuryBodyPart" = EXCLUDED."injuryBodyPart",
        "injuryNotes" = EXCLUDED."injuryNotes",
        "age" = EXCLUDED."age",
        "yearsExp" = EXCLUDED."yearsExp",
        "depthChartPosition" = EXCLUDED."depthChartPosition",
        "depthChartOrder" = EXCLUDED."depthChartOrder",
        "searchRank" = EXCLUDED."searchRank",
        "active" = EXCLUDED."active",
        "syncedAt" = EXCLUDED."syncedAt"
    `;
  }
}

async function upsertStatLines(
  season: number,
  week: number,
  seasonType: string,
  lines: SleeperStatLine[],
) {
  for (const batch of chunk(lines, BATCH_SIZE)) {
    const rows = batch.map((l) => {
      const stats = l.stats ?? {};
      return Prisma.sql`(
        ${crypto.randomUUID()}, ${l.player_id}, ${season}, ${week}, ${seasonType},
        ${l.team ?? null}, ${l.opponent ?? null}, ${JSON.stringify(stats)}::jsonb,
        ${stats.pts_std ?? null}, ${stats.pts_ppr ?? null}, ${stats.pts_half_ppr ?? null}, NOW()
      )`;
    });

    await prisma.$executeRaw`
      INSERT INTO "PlayerStatLine" (
        "id", "playerId", "season", "week", "seasonType", "nflTeam", "opponent",
        "stats", "ptsStd", "ptsPpr", "ptsHalfPpr", "updatedAt"
      )
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("playerId", "season", "week", "seasonType") DO UPDATE SET
        "nflTeam" = EXCLUDED."nflTeam",
        "opponent" = EXCLUDED."opponent",
        "stats" = EXCLUDED."stats",
        "ptsStd" = EXCLUDED."ptsStd",
        "ptsPpr" = EXCLUDED."ptsPpr",
        "ptsHalfPpr" = EXCLUDED."ptsHalfPpr",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  }
}

export type SyncSummary = {
  season: number;
  week: number;
  seasonType: string;
  playerCount: number;
  statLineCount: number;
};

// Pulls the full player list (identity + status/injury) and the current week's
// stats from Sleeper, and upserts both. Pass `backfillWeeks: true` once, after
// first attaching the database, to also pull every earlier week of the season
// so there's a full season of history instead of just the latest week.
export async function syncSleeperData(
  options: { backfillWeeks?: boolean } = {},
): Promise<SyncSummary> {
  try {
    const [state, playersById] = await Promise.all([getNflState(), getAllPlayers()]);
    const season = Number(state.season);
    const currentWeek = state.week || state.display_week;
    const seasonType = state.season_type;

    const playerList = Object.values(playersById);
    await upsertPlayers(playerList);
    const knownIds = new Set(playerList.map((p) => p.player_id));

    const weeksToSync =
      options.backfillWeeks && seasonType !== "pre"
        ? Array.from({ length: Math.max(currentWeek, 1) }, (_, i) => i + 1)
        : [currentWeek];

    let statLineCount = 0;
    for (const week of weeksToSync) {
      const lines = await getWeekStats(season, week, "regular");
      const filtered = lines.filter((l) => knownIds.has(l.player_id));
      await upsertStatLines(season, week, "regular", filtered);
      statLineCount += filtered.length;
    }

    await prisma.syncState.upsert({
      where: { id: 1 },
      create: { id: 1, season, week: currentWeek, seasonType, lastSyncedAt: new Date() },
      update: { season, week: currentWeek, seasonType, lastSyncedAt: new Date(), lastError: null },
    });

    return { season, week: currentWeek, seasonType, playerCount: playerList.length, statLineCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncState.upsert({
      where: { id: 1 },
      create: { id: 1, lastError: message, lastSyncedAt: new Date() },
      update: { lastError: message, lastSyncedAt: new Date() },
    });
    throw err;
  }
}
