"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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
    data: { fantasyTeamId: fantasyTeamId || null },
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
