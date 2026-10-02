-- AlterTable: active/bench status within a fantasy roster. Defaults to
-- "bench" for every existing row, including current free agents (harmless —
-- the column is only read for rostered players).
ALTER TABLE "Player" ADD COLUMN "rosterStatus" TEXT NOT NULL DEFAULT 'bench';
