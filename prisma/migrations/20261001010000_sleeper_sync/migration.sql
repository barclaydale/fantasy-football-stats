-- Replace the hand-entered Player table with one shaped for real players
-- synced from Sleeper, and add weekly stat lines + a sync-tracking singleton.
-- The old Player rows were placeholder test data from before the Sleeper
-- integration existed, so this drops and recreates rather than migrating rows.
DROP TABLE "Player" CASCADE;

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "position" TEXT,
    "fantasyPositions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "nflTeam" TEXT,
    "status" TEXT,
    "injuryStatus" TEXT,
    "injuryBodyPart" TEXT,
    "injuryNotes" TEXT,
    "age" INTEGER,
    "yearsExp" INTEGER,
    "depthChartPosition" TEXT,
    "depthChartOrder" INTEGER,
    "searchRank" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fantasyTeamId" TEXT,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStatLine" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" TEXT NOT NULL DEFAULT 'regular',
    "nflTeam" TEXT,
    "opponent" TEXT,
    "stats" JSONB NOT NULL,
    "ptsStd" DOUBLE PRECISION,
    "ptsPpr" DOUBLE PRECISION,
    "ptsHalfPpr" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStatLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "season" INTEGER,
    "week" INTEGER,
    "seasonType" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Player_fantasyTeamId_idx" ON "Player"("fantasyTeamId");

-- CreateIndex
CREATE INDEX "Player_position_idx" ON "Player"("position");

-- CreateIndex
CREATE INDEX "Player_searchRank_idx" ON "Player"("searchRank");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStatLine_playerId_season_week_seasonType_key" ON "PlayerStatLine"("playerId", "season", "week", "seasonType");

-- CreateIndex
CREATE INDEX "PlayerStatLine_season_week_idx" ON "PlayerStatLine"("season", "week");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStatLine" ADD CONSTRAINT "PlayerStatLine_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
