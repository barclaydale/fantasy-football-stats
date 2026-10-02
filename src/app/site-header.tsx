import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function SiteHeader() {
  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });

  const dotColor = syncState?.lastError
    ? "bg-danger"
    : syncState?.lastSyncedAt
      ? "bg-accent"
      : "bg-muted";

  const statusText = syncState?.lastError
    ? "Sync error"
    : syncState?.lastSyncedAt
      ? `Week ${syncState.week} synced`
      : "Not synced";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" aria-hidden />
          Fantasy Football Stats
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-muted transition-colors hover:text-foreground">
            Teams
          </Link>
          <Link href="/matchups" className="text-muted transition-colors hover:text-foreground">
            Matchups
          </Link>
          <Link href="/standings" className="text-muted transition-colors hover:text-foreground">
            Standings
          </Link>
          <Link href="/players" className="text-muted transition-colors hover:text-foreground">
            Players
          </Link>
          <span className="flex items-center gap-1.5 text-muted">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden />
            {statusText}
          </span>
        </nav>
      </div>
    </header>
  );
}
