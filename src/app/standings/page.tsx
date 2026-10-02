import { prisma } from "@/lib/prisma";
import { computeStandingsHistory } from "@/lib/standings";
import { EmptyState, TableShell, td, th, tr } from "../ui";

export default async function StandingsPage() {
  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });

  const season = syncState?.season;
  const throughWeek = Math.max(0, (syncState?.week ?? 1) - 1);

  const { final: records, ranksByWeek } = season
    ? await computeStandingsHistory(season, syncState?.seasonType ?? "regular", throughWeek)
    : { final: new Map(), ranksByWeek: new Map<string, number[]>() };

  const rows = teams
    .map((team) => ({ team, record: records.get(team.id) }))
    .sort((a, b) => {
      const winsA = a.record?.wins ?? 0;
      const winsB = b.record?.wins ?? 0;
      if (winsB !== winsA) return winsB - winsA;
      return (b.record?.pointsFor ?? 0) - (a.record?.pointsFor ?? 0);
    });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6 sm:p-8">
      <div className="flex flex-col gap-4">
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
                    {record
                      ? `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ""}`
                      : "0-0"}
                  </td>
                  <td className={td}>{record ? record.pointsFor.toFixed(1) : "0.0"}</td>
                  <td className={td}>{record ? record.pointsAgainst.toFixed(1) : "0.0"}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>

      {season && throughWeek > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted">Ranking by week</h2>
          <TableShell>
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Team</th>
                {Array.from({ length: throughWeek }, (_, i) => (
                  <th key={i} className={`${th} text-center`}>
                    Wk {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ team }) => {
                const ranks = ranksByWeek.get(team.id) ?? [];
                return (
                  <tr key={team.id} className={tr}>
                    <td className={`${td} font-medium`}>{team.name}</td>
                    {Array.from({ length: throughWeek }, (_, i) => {
                      const rank = ranks[i];
                      return (
                        <td
                          key={i}
                          className={`${td} text-center ${rank === 1 ? "font-semibold text-accent" : ""}`}
                        >
                          {rank ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </div>
      )}
    </main>
  );
}
