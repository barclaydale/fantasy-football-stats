-- AlterTable: pull common box-score stats out of the JSON blob into columns
-- so season-totals pages can SUM/AVG them directly. All nullable/additive —
-- existing rows just read NULL here until the next sync re-populates them.
ALTER TABLE "PlayerStatLine"
  ADD COLUMN "recTargets" DOUBLE PRECISION,
  ADD COLUMN "rec" DOUBLE PRECISION,
  ADD COLUMN "recYards" DOUBLE PRECISION,
  ADD COLUMN "recTds" DOUBLE PRECISION,
  ADD COLUMN "rushAtt" DOUBLE PRECISION,
  ADD COLUMN "rushYards" DOUBLE PRECISION,
  ADD COLUMN "rushTds" DOUBLE PRECISION,
  ADD COLUMN "passAtt" DOUBLE PRECISION,
  ADD COLUMN "passCmp" DOUBLE PRECISION,
  ADD COLUMN "passYards" DOUBLE PRECISION,
  ADD COLUMN "passTds" DOUBLE PRECISION,
  ADD COLUMN "passInt" DOUBLE PRECISION,
  ADD COLUMN "offSnaps" DOUBLE PRECISION,
  ADD COLUMN "teamOffSnaps" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PlayerProjection" (
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
    "rec" DOUBLE PRECISION,
    "recYards" DOUBLE PRECISION,
    "recTds" DOUBLE PRECISION,
    "rushAtt" DOUBLE PRECISION,
    "rushYards" DOUBLE PRECISION,
    "rushTds" DOUBLE PRECISION,
    "passAtt" DOUBLE PRECISION,
    "passCmp" DOUBLE PRECISION,
    "passYards" DOUBLE PRECISION,
    "passTds" DOUBLE PRECISION,
    "passInt" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProjection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProjection_playerId_season_week_seasonType_key" ON "PlayerProjection"("playerId", "season", "week", "seasonType");

-- CreateIndex
CREATE INDEX "PlayerProjection_season_week_idx" ON "PlayerProjection"("season", "week");

-- AddForeignKey
ALTER TABLE "PlayerProjection" ADD CONSTRAINT "PlayerProjection_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
