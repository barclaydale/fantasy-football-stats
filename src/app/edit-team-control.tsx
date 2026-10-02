"use client";

import { useState } from "react";
import { TeamSelect } from "./team-select";
import { CloseIcon, IconButton, PencilIcon } from "./ui";

// A rostered player's team is settled most of the time, so the reassign
// dropdown stays tucked behind this pencil until it's actually needed instead
// of sitting open on every row.
export function EditTeamControl(props: {
  playerId: string;
  fantasyTeamId: string | null;
  teams: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <IconButton
        onClick={() => setEditing(true)}
        aria-label="Move to another team or free agency"
      >
        <PencilIcon className="h-4 w-4" />
      </IconButton>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <TeamSelect {...props} />
      <IconButton onClick={() => setEditing(false)} aria-label="Cancel">
        <CloseIcon className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
