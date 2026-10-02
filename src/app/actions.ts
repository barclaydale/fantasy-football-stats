"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { eligibleSlots, slotInfo } from "@/lib/roster-slots";
import { syncSleeperData } from "@/lib/sync";

export async function createTeam(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.team.create({ data: { name } });
  revalidatePath("/");
}

export async function updateTeam(teamId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.team.update({ where: { id: teamId }, data: { name } });
  revalidatePath("/");
  revalidatePath("/matchups");
  revalidatePath("/standings");
}

export async function deleteTeam(teamId: string) {
  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath("/");
}

export async function assignPlayerToTeam(playerId: string, formData: FormData) {
  const fantasyTeamId = String(formData.get("fantasyTeamId") ?? "").trim();
  await prisma.player.update({
    where: { id: playerId },
    // Reset to bench on every reassignment (including dropping to free agency)
    // so a player never shows up already slotted in on a new team by accident.
    data: { fantasyTeamId: fantasyTeamId || null, rosterSlot: "BN" },
  });
  revalidatePath("/");
}

// Assigning into a full slot bumps whichever incumbent(s) are there down to
// bench to make room, rather than silently refusing the move — so picking
// e.g. FLEX for a benched player always works, even when FLEX is already
// full; it just swaps places with whoever's there.
export async function setRosterSlot(playerId: string, formData: FormData) {
  const requestedSlot = String(formData.get("rosterSlot") ?? "").trim();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { position: true, fantasyTeamId: true, rosterSlot: true },
  });
  if (!player?.fantasyTeamId || player.rosterSlot === requestedSlot) return;

  const allowed = eligibleSlots(player.position).some((s) => s.key === requestedSlot);
  if (!allowed) return;

  await prisma.$transaction(async (tx) => {
    if (requestedSlot !== "BN") {
      const capacity = slotInfo(requestedSlot).capacity;
      const occupants = await tx.player.findMany({
        where: { fantasyTeamId: player.fantasyTeamId, rosterSlot: requestedSlot, id: { not: playerId } },
        select: { id: true },
      });
      const overflow = occupants.length - capacity + 1;
      if (overflow > 0) {
        await tx.player.updateMany({
          where: { id: { in: occupants.slice(0, overflow).map((o) => o.id) } },
          data: { rosterSlot: "BN" },
        });
      }
    }
    await tx.player.update({ where: { id: playerId }, data: { rosterSlot: requestedSlot } });
  });

  revalidatePath("/");
}

// Manual trigger for the same sync the daily cron runs (src/app/api/sync/route.ts).
// Useful right after attaching the database, and the first run should pass
// backfillWeeks so the whole season so far is pulled in, not just this week.
export async function runManualSync(formData: FormData) {
  const backfillWeeks = formData.get("backfillWeeks") === "on";
  await syncSleeperData({ backfillWeeks });
  revalidatePath("/");
}
