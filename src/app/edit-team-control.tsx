"use client";

import { useState } from "react";
import { TeamSelect } from "./team-select";

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path
        d="M13.5 3.5l3 3L7 16H4v-3L13.5 3.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}

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
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Move to another team or free agency"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <TeamSelect {...props} />
      <button
        type="button"
        onClick={() => setEditing(false)}
        aria-label="Cancel"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
