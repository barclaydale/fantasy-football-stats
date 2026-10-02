"use client";

import { setRosterSlot } from "./actions";
import { eligibleSlots } from "@/lib/roster-slots";
import { Select } from "./ui";

export function PositionSlotSelect({
  playerId,
  position,
  rosterSlot,
}: {
  playerId: string;
  position: string | null;
  rosterSlot: string;
}) {
  const action = setRosterSlot.bind(null, playerId);
  // Every eligible slot is always offered, full or not — picking a full one
  // bumps whoever's there to bench (see setRosterSlot) instead of being
  // silently refused, so this never needs to hide "full" options.
  const options = eligibleSlots(position);

  return (
    <form action={action}>
      <Select
        name="rosterSlot"
        defaultValue={rosterSlot}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="py-1 text-xs font-medium"
      >
        {options.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </Select>
    </form>
  );
}
