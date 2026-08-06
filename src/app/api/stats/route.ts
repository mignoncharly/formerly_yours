import { NextRequest, NextResponse } from "next/server";
import { readStats } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Aggregated validation stats. Protected by a shared admin key so the numbers
// that decide "go / no-go to Phase 1" aren't publicly readable.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const expected = process.env.FY_ADMIN_KEY;

  if (!expected || key !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const stats = await readStats();
  return NextResponse.json({ ok: true, stats });
}
