"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createTeam(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  if (!name) return;

  await prisma.team.create({
    data: { name, ownerName: ownerName || null },
  });
  revalidatePath("/");
}

export async function createPlayer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const nflTeam = String(formData.get("nflTeam") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? "").trim();
  if (!name || !position) return;

  await prisma.player.create({
    data: {
      name,
      position,
      nflTeam: nflTeam || null,
      teamId: teamId || null,
    },
  });
  revalidatePath("/");
}

export async function assignPlayerToTeam(playerId: string, formData: FormData) {
  const teamId = String(formData.get("teamId") ?? "").trim();
  await prisma.player.update({
    where: { id: playerId },
    data: { teamId: teamId || null },
  });
  revalidatePath("/");
}

export async function deletePlayer(playerId: string) {
  await prisma.player.delete({ where: { id: playerId } });
  revalidatePath("/");
}

export async function deleteTeam(teamId: string) {
  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath("/");
}
