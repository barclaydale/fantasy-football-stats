import { NextRequest, NextResponse } from "next/server";
import { syncSleeperData } from "@/lib/sync";

// Vercel Hobby allows up to 300s per function; a full-season backfill (looping
// every week) needs more headroom than the default, so claim the max.
export const maxDuration = 300;

// Triggered once a day by the Vercel Cron in vercel.json. Vercel sends
// `Authorization: Bearer $CRON_SECRET` on cron-triggered requests, which is
// what stops anyone else from hitting this route and forcing a sync.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backfillWeeks = request.nextUrl.searchParams.get("backfill") === "true";
  const summary = await syncSleeperData({ backfillWeeks });
  return NextResponse.json(summary);
}
