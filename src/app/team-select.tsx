"use client";

import { assignPlayerToTeam } from "./actions";

export function TeamSelect({
  playerId,
  teamId,
  teams,
}: {
  playerId: string;
  teamId: string | null;
  teams: { id: string; name: string }[];
}) {
  const action = assignPlayerToTeam.bind(null, playerId);

  return (
    <form action={action}>
      <select
        name="teamId"
        defaultValue={teamId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded border border-gray-300 bg-background px-2 py-1 text-sm"
      >
        <option value="">Free agent</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </form>
  );
}
