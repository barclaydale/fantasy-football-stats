// This league's starting lineup: 1 QB, 2 RB, 2 WR, 1 TE, 2 WRT (flex), 1 K,
// 1 DEF, plus 5 bench spots (15-man roster). Colors are Sleeper's own
// position colors, pulled from their shipped CSS (sleepercdn.com _next
// chunks, --color-dls-position-* tokens), not invented.
export type RosterSlotKey = "QB" | "RB" | "WR" | "TE" | "WRT" | "K" | "DEF" | "BN";

type SlotDef = {
  key: RosterSlotKey;
  label: string;
  capacity: number;
  eligible: string[] | null; // null = any position (bench)
  color: string;
};

export const ROSTER_SLOTS: SlotDef[] = [
  { key: "QB", label: "QB", capacity: 1, eligible: ["QB"], color: "#ff6482" },
  { key: "RB", label: "RB", capacity: 2, eligible: ["RB"], color: "#28e757" },
  { key: "WR", label: "WR", capacity: 2, eligible: ["WR"], color: "#00d7ff" },
  { key: "TE", label: "TE", capacity: 1, eligible: ["TE"], color: "#ffab0e" },
  { key: "WRT", label: "FLEX", capacity: 2, eligible: ["WR", "RB", "TE"], color: "#644af7" },
  { key: "K", label: "K", capacity: 1, eligible: ["K"], color: "#c96cff" },
  { key: "DEF", label: "DEF", capacity: 1, eligible: ["DEF"], color: "#d26200" },
  { key: "BN", label: "BENCH", capacity: 5, eligible: null, color: "#8996aa" },
];

const BY_KEY = new Map(ROSTER_SLOTS.map((s) => [s.key, s]));
const BENCH_SLOT = BY_KEY.get("BN")!;

export function slotInfo(key: string): SlotDef {
  return BY_KEY.get(key as RosterSlotKey) ?? BENCH_SLOT;
}

export function slotColor(position: string | null | undefined): string {
  const match = ROSTER_SLOTS.find((s) => s.eligible?.includes(position ?? ""));
  return match?.color ?? BENCH_SLOT.color;
}

// Slots a player with this NFL position is allowed to fill (always includes bench).
export function eligibleSlots(position: string | null | undefined): SlotDef[] {
  return ROSTER_SLOTS.filter((s) => s.eligible === null || s.eligible.includes(position ?? ""));
}

export const SLOT_ORDER: readonly string[] = ROSTER_SLOTS.map((s) => s.key);
