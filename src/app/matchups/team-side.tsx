import type { PlayerLine, TeamWeekScore } from "@/lib/matchup-score";

export function TeamSide({
  teamName,
  record,
  score,
  winPct,
  align,
}: {
  teamName: string;
  record: string | null;
  score: TeamWeekScore | null;
  winPct: number | null;
  align: "left" | "right";
}) {
  const favored = winPct != null && winPct >= 0.5;
  const items = align === "right" ? "items-end text-right" : "items-start text-left";

  return (
    <div className={`flex flex-1 flex-col gap-0.5 ${items}`}>
      <span className="font-semibold">{teamName}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold">{score ? score.actualOnly.toFixed(1) : "—"}</span>
        <span className="text-xs text-muted">actual</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-medium text-muted">
          {score ? score.projectedTotal.toFixed(1) : "—"}
        </span>
        <span className="text-xs text-muted">proj</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        {record && <span>{record}</span>}
        {winPct != null && (
          <span className={favored ? "font-semibold text-accent" : "font-semibold text-danger"}>
            {Math.round(winPct * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function TeamStarters({
  players,
  align,
}: {
  players: PlayerLine[];
  align: "left" | "right";
}) {
  const items = align === "right" ? "items-end" : "items-start";

  return (
    <ul className={`flex flex-col gap-1.5 text-xs ${items}`}>
      {players.map((p) => (
        <li
          key={p.id}
          className={`flex w-full items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}
        >
          <span className="min-w-0 flex-1 truncate text-muted">
            <span className="text-foreground">{p.name}</span>
            {p.position ? ` ${p.position}` : ""}
            {p.opponent ? ` vs ${p.opponent}` : ""}
          </span>
          <span
            className={`shrink-0 ${p.actualPoints != null ? "font-medium text-foreground" : "text-muted"}`}
          >
            {p.actualPoints != null
              ? p.actualPoints.toFixed(1)
              : p.projectedPoints != null
                ? `${p.projectedPoints.toFixed(1)} proj`
                : "—"}
          </span>
        </li>
      ))}
      {players.length === 0 && <li className="text-muted">No starters set.</li>}
    </ul>
  );
}
