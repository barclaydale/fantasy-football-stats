import type { PairedRow, PlayerLine } from "@/lib/matchup-score";
import { playerImageUrl, shortPlayerName } from "@/lib/player-image";

function PlayerHalf({ player, align }: { player: PlayerLine | null; align: "left" | "right" }) {
  if (!player) return <div className="flex-1" />;

  const img = playerImageUrl(player.id, player.position, player.nflTeam);

  return (
    <div
      className={`flex flex-1 items-center gap-2.5 overflow-hidden ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full bg-surface-hover object-cover"
        />
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{shortPlayerName(player.name)}</div>
        <div className="truncate text-xs text-muted">
          {player.position ?? "—"} - {player.nflTeam ?? "FA"}
        </div>
      </div>
    </div>
  );
}

function StatusLine({ player, align }: { player: PlayerLine | null; align: "left" | "right" }) {
  if (!player) return <div className="flex-1" />;
  const played = player.actualPoints != null;

  return (
    <div className={`flex-1 truncate text-xs text-muted ${align === "right" ? "text-right" : "text-left"}`}>
      {player.opponent ? `vs ${player.opponent} · ` : ""}
      {played ? "Final" : "Yet to play"}
    </div>
  );
}

function PointsLabel({ player }: { player: PlayerLine | null }) {
  if (!player) return <span className="text-muted">—</span>;
  if (player.actualPoints != null) {
    return <span className="font-semibold text-foreground">{player.actualPoints.toFixed(1)}</span>;
  }
  if (player.projectedPoints != null) {
    return <span className="text-muted">{player.projectedPoints.toFixed(1)}</span>;
  }
  return <span className="text-muted">—</span>;
}

export function MatchupStarters({ rows }: { rows: PairedRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted">No starters set for either team yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={`${row.slotKey}-${i}`} className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center gap-3">
            <PlayerHalf player={row.left} align="left" />
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ backgroundColor: `${row.slotColor}26`, color: row.slotColor }}
            >
              {row.slotLabel === "BENCH" ? "BN" : row.slotLabel.slice(0, 3)}
            </span>
            <PlayerHalf player={row.right} align="right" />
          </div>
          <div className="mt-2 flex items-center gap-3 border-t border-border pt-2">
            <StatusLine player={row.left} align="left" />
            <div className="flex shrink-0 items-center gap-6 text-sm">
              <PointsLabel player={row.left} />
              <PointsLabel player={row.right} />
            </div>
            <StatusLine player={row.right} align="right" />
          </div>
        </div>
      ))}
    </div>
  );
}
