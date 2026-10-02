import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createTeam, deleteTeam, runManualSync } from "./actions";
import { TeamSelect } from "./team-select";

function PlayerLine({
  player,
  pts,
  teams,
}: {
  player: {
    id: string;
    fullName: string | null;
    position: string | null;
    nflTeam: string | null;
    injuryStatus: string | null;
    fantasyTeamId: string | null;
  };
  pts: number | null | undefined;
  teams: { id: string; name: string }[];
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span>
        <Link href={`/players/${player.id}`} className="hover:underline">
          {player.fullName ?? "Unknown player"}
        </Link>{" "}
        <span className="text-muted">
          ({player.position ?? "—"}
          {player.nflTeam ? ` · ${player.nflTeam}` : ""})
        </span>
        {player.injuryStatus && (
          <span className="ml-1 rounded bg-danger-bg px-1.5 py-0.5 text-xs text-danger">
            {player.injuryStatus}
          </span>
        )}
        {pts != null && <span className="ml-2 text-muted">{pts.toFixed(1)} pts</span>}
      </span>
      <TeamSelect playerId={player.id} fantasyTeamId={player.fantasyTeamId} teams={teams} />
    </li>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });

  const [teams, freeAgents] = await Promise.all([
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: { players: { orderBy: { fullName: "asc" } } },
    }),
    prisma.player.findMany({
      where: {
        fantasyTeamId: null,
        ...(query ? { fullName: { contains: query, mode: "insensitive" } } : {}),
      },
      orderBy: query ? { fullName: "asc" } : [{ searchRank: { sort: "asc", nulls: "last" } }],
      take: 50,
    }),
  ]);

  const allShownIds = [...teams.flatMap((t) => t.players.map((p) => p.id)), ...freeAgents.map((p) => p.id)];

  const statLines =
    syncState?.season != null && syncState.week != null && allShownIds.length > 0
      ? await prisma.playerStatLine.findMany({
          where: {
            playerId: { in: allShownIds },
            season: syncState.season,
            week: syncState.week,
            seasonType: syncState.seasonType ?? "regular",
          },
          select: { playerId: true, ptsPpr: true },
        })
      : [];
  const ptsByPlayer = new Map(statLines.map((s) => [s.playerId, s.ptsPpr]));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Welcome to Fantasy Football Stats</h1>
          <Link href="/stats" className="text-sm text-muted hover:underline">
            Season stats →
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted">
          {syncState?.lastSyncedAt
            ? `Synced from Sleeper: season ${syncState.season}, week ${syncState.week} (${syncState.seasonType}), last run ${syncState.lastSyncedAt.toLocaleString()}.`
            : "Not synced yet — run a sync below to pull players and stats from Sleeper."}
          {syncState?.lastError && (
            <span className="ml-2 text-danger">Last sync error: {syncState.lastError}</span>
          )}
        </p>
        <form action={runManualSync} className="mt-3 flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm text-muted">
            <input type="checkbox" name="backfillWeeks" />
            Backfill the whole season (first run only — slower)
          </label>
          <button
            type="submit"
            className="rounded bg-accent px-3 py-1 text-sm font-medium text-accent-foreground hover:bg-accent-bright"
          >
            Sync now
          </button>
        </form>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Teams</h2>
        <form action={createTeam} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="Team name"
            required
            className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
          />
          <input
            name="ownerName"
            placeholder="Owner (optional)"
            className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
          />
          <button
            type="submit"
            className="rounded bg-accent px-3 py-1 text-sm font-medium text-accent-foreground hover:bg-accent-bright"
          >
            Add team
          </button>
        </form>

        <div className="flex flex-col gap-4">
          {teams.map((team) => (
            <div key={team.id} className="rounded border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{team.name}</h3>
                  {team.ownerName && (
                    <p className="text-sm text-muted">{team.ownerName}</p>
                  )}
                </div>
                <form action={deleteTeam.bind(null, team.id)}>
                  <button type="submit" className="text-sm text-danger">
                    Delete team
                  </button>
                </form>
              </div>

              <ul className="mt-3 flex flex-col gap-2">
                {team.players.map((player) => (
                  <PlayerLine
                    key={player.id}
                    player={player}
                    pts={ptsByPlayer.get(player.id)}
                    teams={teams}
                  />
                ))}
                {team.players.length === 0 && (
                  <li className="text-sm text-muted">No players yet.</li>
                )}
              </ul>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="text-sm text-muted">No teams yet — add one above.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Players</h2>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search players by name…"
            className="w-64 rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
          />
          <button
            type="submit"
            className="rounded bg-accent px-3 py-1 text-sm font-medium text-accent-foreground hover:bg-accent-bright"
          >
            Search
          </button>
        </form>

        <div>
          <h3 className="mb-2 font-medium">
            {query ? `Free agents matching "${query}"` : "Free agents (top by relevance)"}
          </h3>
          <ul className="flex flex-col gap-2">
            {freeAgents.map((player) => (
              <PlayerLine
                key={player.id}
                player={player}
                pts={ptsByPlayer.get(player.id)}
                teams={teams}
              />
            ))}
            {freeAgents.length === 0 && (
              <li className="text-sm text-muted">
                {syncState ? "No matching free agents." : "Run a sync above to load players."}
              </li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
