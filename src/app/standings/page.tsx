import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/lib/standings";
import { EmptyState, TableShell, td, th, tr } from "../ui";

export default async function StandingsPage() {
  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });

  const season = syncState?.season;
  const throughWeek = Math.max(0, (syncState?.week ?? 1) - 1);

  const records = season
    ? await computeStandings(season, syncState?.seasonType ?? "regular", throughWeek)
    : new Map();

  const rows = teams
    .map((team) => ({ team, record: records.get(team.id) }))
    .sort((a, b) => {
      const winsA = a.record?.wins ?? 0;
      const winsB = b.record?.wins ?? 0;
      if (winsB !== winsA) return winsB - winsA;
      return (b.record?.pointsFor ?? 0) - (a.record?.pointsFor ?? 0);
    });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <h1 className="text-xl font-semibold">Standings{season ? ` — ${season}` : ""}</h1>

      {!season ? (
        <EmptyState>No synced data yet — run a sync from the home page.</EmptyState>
      ) : teams.length === 0 ? (
        <EmptyState>No teams yet — add some from the home page.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>#</th>
              <th className={th}>Team</th>
              <th className={th}>Record</th>
              <th className={th}>PF</th>
              <th className={th}>PA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ team, record }, i) => (
              <tr key={team.id} className={tr}>
                <td className={`${td} text-muted`}>{i + 1}</td>
                <td className={`${td} font-medium`}>{team.name}</td>
                <td className={td}>
                  {record ? `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ""}` : "0-0"}
                </td>
                <td className={td}>{record ? record.pointsFor.toFixed(1) : "0.0"}</td>
                <td className={td}>{record ? record.pointsAgainst.toFixed(1) : "0.0"}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </main>
  );
}
