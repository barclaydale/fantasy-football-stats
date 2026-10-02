"use client";

import { assignPlayerToTeam } from "./actions";

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
      <select
        name="fantasyTeamId"
        defaultValue={fantasyTeamId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
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
