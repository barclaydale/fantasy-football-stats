"use client";

import { useState } from "react";
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
  const [expanded, setExpanded] = useState(false);
  const favored = winPct != null && winPct >= 0.5;
  const items = align === "right" ? "items-end text-right" : "items-start text-left";
  const hasPlayers = !!score && score.players.length > 0;

  return (
    <div className={`flex flex-1 flex-col gap-1 ${items}`}>
      <span className="font-semibold">{teamName}</span>
      <button
        type="button"
        onClick={() => hasPlayers && setExpanded((e) => !e)}
        className={`text-2xl font-bold ${hasPlayers ? "cursor-pointer transition-colors hover:text-accent" : "cursor-default"}`}
      >
        {score ? score.total.toFixed(1) : "—"}
      </button>
      <div className="flex items-center gap-2 text-xs text-muted">
        {record && <span>{record}</span>}
        {winPct != null && (
          <span className={favored ? "font-semibold text-accent" : "font-semibold text-danger"}>
            {Math.round(winPct * 100)}%
          </span>
        )}
      </div>

      {expanded && hasPlayers && (
        <ul className="mt-2 flex w-full flex-col gap-1 border-t border-border pt-2 text-xs">
          {score!.players.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <span className="truncate text-muted">
                <span className="text-foreground">{p.name}</span>{" "}
                {p.position}
                {p.opponent ? ` vs ${p.opponent}` : ""}
              </span>
              <span className={`shrink-0 ${p.projected ? "text-muted" : "font-medium text-foreground"}`}>
                {p.points.toFixed(1)}
                {p.projected ? " proj" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
