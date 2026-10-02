"use client";

import { setRosterSlot } from "./actions";
import { eligibleSlots } from "@/lib/roster-slots";
import { Select } from "./ui";

export function PositionSlotSelect({
  playerId,
  position,
  rosterSlot,
  openSlots,
}: {
  playerId: string;
  position: string | null;
  rosterSlot: string;
  // Slot keys with room left on this team, besides whichever this player
  // already occupies (that one's always included so it stays selectable).
  openSlots: Set<string>;
}) {
  const action = setRosterSlot.bind(null, playerId);
  const options = eligibleSlots(position).filter(
    (s) => s.key === rosterSlot || openSlots.has(s.key),
  );

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
