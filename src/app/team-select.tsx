"use client";

import { assignPlayerToTeam } from "./actions";
import { Select } from "./ui";

export function TeamSelect({
  playerId,
  fantasyTeamId,
  teams,
}: {
  playerId: string;
  fantasyTeamId: string | null;
  teams: { id: string; name: string }[];
}) {
  const action = assignPlayerToTeam.bind(null, playerId);

  return (
    <form action={action}>
      <Select
        name="fantasyTeamId"
        defaultValue={fantasyTeamId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="py-1 text-xs"
      >
        <option value="">Free agent</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </Select>
    </form>
  );
}
