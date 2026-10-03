"use client";

import { Select } from "../ui";

export function TeamFilterSelect({
  teams,
  selectedTeamId,
}: {
  teams: { id: string; name: string }[];
  selectedTeamId: string;
}) {
  return (
    <form className="flex items-center gap-2">
      <label className="text-sm text-muted" htmlFor="team-filter">
        Compare to team
      </label>
      <Select
        id="team-filter"
        name="team"
        defaultValue={selectedTeamId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">— None —</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </Select>
    </form>
  );
}
