import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ROSTER_SLOTS, SLOT_ORDER } from "@/lib/roster-slots";
import { createTeam, deleteTeam, runManualSync } from "./actions";
import { EditTeamControl } from "./edit-team-control";
import { PositionSlotSelect } from "./position-slot-select";
import { SearchForm } from "./search-form";
import { TeamSelect } from "./team-select";
import { Button, Card, EmptyState, GhostButton, InjuryBadge, PositionTag, TextInput } from "./ui";

type RosterPlayer = {
  id: string;
  fullName: string | null;
  position: string | null;
  nflTeam: string | null;
  injuryStatus: string | null;
  fantasyTeamId: string | null;
  rosterSlot: string;
};

function PlayerRow({
  player,
  pts,
  teams,
  openSlots,
}: {
  player: RosterPlayer;
  pts: number | null | undefined;
  teams: { id: string; name: string }[];
  openSlots: Set<string>;
}) {
  const rostered = player.fantasyTeamId != null;
  const benched = rostered && player.rosterSlot === "BN";

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover ${
        benched ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Link
          href={`/players/${player.id}`}
          className="font-medium text-foreground hover:text-accent"
        >
          {player.fullName ?? "Unknown player"}
        </Link>
        <span className="shrink-0 text-muted">
          <PositionTag position={player.position} />
          {player.nflTeam ? ` · ${player.nflTeam}` : ""}
        </span>
        {player.injuryStatus && <InjuryBadge status={player.injuryStatus} />}
        {pts != null && (
          <span className="shrink-0 font-medium text-accent">{pts.toFixed(1)} pts</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {rostered && (
          <PositionSlotSelect
            playerId={player.id}
            position={player.position}
            rosterSlot={player.rosterSlot}
            openSlots={openSlots}
          />
        )}
        {rostered ? (
          <EditTeamControl playerId={player.id} fantasyTeamId={player.fantasyTeamId} teams={teams} />
        ) : (
          <TeamSelect playerId={player.id} fantasyTeamId={player.fantasyTeamId} teams={teams} />
        )}
      </div>
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

  const [teamsRaw, freeAgents] = await Promise.all([
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

  // Lineup order (QB, RB, WR, TE, FLEX, K, DEF, then bench) instead of alphabetical.
  const teams = teamsRaw.map((team) => ({
    ...team,
    players: [...team.players].sort(
      (a, b) =>
        SLOT_ORDER.indexOf(a.rosterSlot) - SLOT_ORDER.indexOf(b.rosterSlot) ||
        (a.fullName ?? "").localeCompare(b.fullName ?? ""),
    ),
  }));

  // Which slots still have room on each team, for the slot dropdowns' options.
  const openSlotsByTeam = new Map<string, Set<string>>();
  for (const team of teams) {
    const counts = new Map<string, number>();
    for (const p of team.players) counts.set(p.rosterSlot, (counts.get(p.rosterSlot) ?? 0) + 1);
    const open = new Set<string>();
    for (const slot of ROSTER_SLOTS) {
      if ((counts.get(slot.key) ?? 0) < slot.capacity) open.add(slot.key);
    }
    openSlotsByTeam.set(team.id, open);
  }

  const allShownIds = [
    ...teams.flatMap((t) => t.players.map((p) => p.id)),
    ...freeAgents.map((p) => p.id),
  ];

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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6 sm:p-8">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {syncState?.lastSyncedAt ? (
            <>
              Season {syncState.season}, week {syncState.week} ({syncState.seasonType}) · last
              synced {syncState.lastSyncedAt.toLocaleString()}
            </>
          ) : (
            "Not synced yet — run a sync to pull players and stats from Sleeper."
          )}
          {syncState?.lastError && (
            <span className="ml-2 text-danger">Last sync error: {syncState.lastError}</span>
          )}
        </p>
        <form action={runManualSync} className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" name="backfillWeeks" className="accent-accent" />
            Backfill season
          </label>
          <Button type="submit">Sync now</Button>
        </form>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Teams</h1>
        </div>
        <form action={createTeam} className="flex flex-wrap gap-2">
          <TextInput name="name" placeholder="Team name" required />
          <TextInput name="ownerName" placeholder="Owner (optional)" />
          <Button type="submit">Add team</Button>
        </form>

        {teams.length === 0 ? (
          <EmptyState>No teams yet — add one above.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {teams.map((team) => (
              <Card key={team.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      {team.name} <span className="text-muted">({team.players.length})</span>
                    </h2>
                    {team.ownerName && <p className="text-sm text-muted">{team.ownerName}</p>}
                  </div>
                  <form action={deleteTeam.bind(null, team.id)}>
                    <GhostButton type="submit" className="px-2 py-1 text-xs">
                      Delete
                    </GhostButton>
                  </form>
                </div>

                <ul className="flex flex-col divide-y divide-border">
                  {team.players.map((player) => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      pts={ptsByPlayer.get(player.id)}
                      teams={teams}
                      openSlots={openSlotsByTeam.get(team.id) ?? new Set()}
                    />
                  ))}
                  {team.players.length === 0 && (
                    <li className="py-2 text-sm text-muted">No players yet.</li>
                  )}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Players</h2>
        <SearchForm defaultValue={query ?? ""} />

        <Card>
          <h3 className="mb-2 text-sm font-medium text-muted">
            {query ? `Free agents matching "${query}"` : "Free agents (top by relevance)"}
          </h3>
          <ul className="flex flex-col divide-y divide-border">
            {freeAgents.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                pts={ptsByPlayer.get(player.id)}
                teams={teams}
                openSlots={new Set()}
              />
            ))}
            {freeAgents.length === 0 && (
              <li className="py-2 text-sm text-muted">
                {syncState ? "No matching free agents." : "Run a sync above to load players."}
              </li>
            )}
          </ul>
        </Card>
      </section>
    </main>
  );
}
