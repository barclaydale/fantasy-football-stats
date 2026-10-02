import { prisma } from "@/lib/prisma";
import { createPlayer, createTeam, deletePlayer, deleteTeam } from "./actions";
import { TeamSelect } from "./team-select";

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"];

export default async function Home() {
  const [teams, freeAgents] = await Promise.all([
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: { players: { orderBy: { name: "asc" } } },
    }),
    prisma.player.findMany({
      where: { teamId: null },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
      <h1 className="text-3xl font-semibold">Welcome to Fantasy Football Stats</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Teams</h2>
        <form action={createTeam} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="Team name"
            required
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            name="ownerName"
            placeholder="Owner (optional)"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-foreground px-3 py-1 text-sm text-background"
          >
            Add team
          </button>
        </form>

        <div className="flex flex-col gap-4">
          {teams.map((team) => (
            <div key={team.id} className="rounded border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{team.name}</h3>
                  {team.ownerName && (
                    <p className="text-sm text-gray-500">{team.ownerName}</p>
                  )}
                </div>
                <form action={deleteTeam.bind(null, team.id)}>
                  <button type="submit" className="text-sm text-red-600">
                    Delete team
                  </button>
                </form>
              </div>

              <ul className="mt-3 flex flex-col gap-2">
                {team.players.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {player.name}{" "}
                      <span className="text-gray-500">
                        ({player.position}
                        {player.nflTeam ? ` · ${player.nflTeam}` : ""})
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <TeamSelect
                        playerId={player.id}
                        teamId={player.teamId}
                        teams={teams}
                      />
                      <form action={deletePlayer.bind(null, player.id)}>
                        <button type="submit" className="text-red-600">
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
                {team.players.length === 0 && (
                  <li className="text-sm text-gray-400">No players yet.</li>
                )}
              </ul>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="text-sm text-gray-400">No teams yet — add one above.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Players</h2>
        <form action={createPlayer} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="Player name"
            required
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <select
            name="position"
            required
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
          <input
            name="nflTeam"
            placeholder="NFL team (optional)"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <select
            name="teamId"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">Free agent</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded bg-foreground px-3 py-1 text-sm text-background"
          >
            Add player
          </button>
        </form>

        <div>
          <h3 className="mb-2 font-medium">Free agents</h3>
          <ul className="flex flex-col gap-2">
            {freeAgents.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {player.name}{" "}
                  <span className="text-gray-500">
                    ({player.position}
                    {player.nflTeam ? ` · ${player.nflTeam}` : ""})
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <TeamSelect playerId={player.id} teamId={null} teams={teams} />
                  <form action={deletePlayer.bind(null, player.id)}>
                    <button type="submit" className="text-red-600">
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
            {freeAgents.length === 0 && (
              <li className="text-sm text-gray-400">No free agents.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
