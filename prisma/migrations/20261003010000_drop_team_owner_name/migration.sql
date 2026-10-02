-- The team's own name now doubles as its schedule-matching identifier
-- (src/lib/schedule.ts), so the separate owner field is gone.
ALTER TABLE "Team" DROP COLUMN "ownerName";
