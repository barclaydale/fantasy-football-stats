-- Replace the active/bench toggle with a specific lineup slot
-- (QB/RB/WR/TE/WRT/K/DEF/BN). Every existing rostered player lands on the
-- bench and gets reassigned a real slot from the UI.
ALTER TABLE "Player" RENAME COLUMN "rosterStatus" TO "rosterSlot";
ALTER TABLE "Player" ALTER COLUMN "rosterSlot" SET DEFAULT 'BN';
UPDATE "Player" SET "rosterSlot" = 'BN';
