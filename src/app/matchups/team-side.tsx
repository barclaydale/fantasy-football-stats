import type { TeamWeekScore } from "@/lib/matchup-score";

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
