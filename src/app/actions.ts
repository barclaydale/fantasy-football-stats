"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { eligibleSlots, slotInfo } from "@/lib/roster-slots";
import { syncSleeperData } from "@/lib/sync";

export async function createTeam(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  if (!name) return;

  await prisma.team.create({
    data: { name, ownerName: ownerName || null },
  });
  revalidatePath("/");
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

export async function setRosterSlot(playerId: string, formData: FormData) {
  const requestedSlot = String(formData.get("rosterSlot") ?? "").trim();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { position: true, fantasyTeamId: true },
  });
  if (!player?.fantasyTeamId) return;

  const allowed = eligibleSlots(player.position).some((s) => s.key === requestedSlot);
  if (!allowed) return;

  const capacity = slotInfo(requestedSlot).capacity;
  const occupied = await prisma.player.count({
    where: { fantasyTeamId: player.fantasyTeamId, rosterSlot: requestedSlot, id: { not: playerId } },
  });
  if (occupied >= capacity) return;

  await prisma.player.update({ where: { id: playerId }, data: { rosterSlot: requestedSlot } });
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
