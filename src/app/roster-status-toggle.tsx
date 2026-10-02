import { toggleRosterStatus } from "./actions";

export function RosterStatusToggle({
  playerId,
  isActive,
}: {
  playerId: string;
  isActive: boolean;
}) {
  return (
    <form action={toggleRosterStatus.bind(null, playerId)} className="flex items-center gap-1.5">
      <span className={`text-xs ${isActive ? "text-muted" : "font-medium text-foreground"}`}>
        Bench
      </span>
      <button
        type="submit"
        role="switch"
        aria-checked={isActive}
        aria-label={isActive ? "Active — click to bench" : "Benched — click to activate"}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          isActive ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${
            isActive ? "translate-x-[18px]" : "translate-x-1"
          }`}
        />
      </button>
      <span className={`text-xs ${isActive ? "font-medium text-foreground" : "text-muted"}`}>
        Active
      </span>
    </form>
  );
}
