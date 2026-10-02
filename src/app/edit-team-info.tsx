"use client";

import { useState } from "react";
import { updateTeam } from "./actions";
import { CloseIcon, IconButton, PencilIcon, TextInput } from "./ui";

export function EditTeamInfo({
  teamId,
  name,
  playerCount,
}: {
  teamId: string;
  name: string;
  playerCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateTeam.bind(null, teamId);

  if (!editing) {
    return (
      <div className="flex items-start gap-1">
        <h2 className="font-semibold">
          {name} <span className="text-muted">({playerCount})</span>
        </h2>
        <IconButton onClick={() => setEditing(true)} aria-label="Rename team">
          <PencilIcon className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    );
  }

  return (
    <form
      action={action}
      onSubmit={() => setEditing(false)}
      className="flex flex-wrap items-center gap-1.5"
    >
      <TextInput name="name" defaultValue={name} required className="w-32 py-1 text-sm" />
      <button
        type="submit"
        className="rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground"
      >
        Save
      </button>
      <IconButton type="button" onClick={() => setEditing(false)} aria-label="Cancel">
        <CloseIcon className="h-3.5 w-3.5" />
      </IconButton>
    </form>
  );
}
