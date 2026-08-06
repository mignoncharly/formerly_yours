import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const event = typeof b.event === "string" ? b.event : null;
  if (!event) {
    return NextResponse.json({ ok: false, error: "missing_event" }, { status: 400 });
  }

  try {
    await recordEvent(
      {
        event,
        properties:
          b.properties && typeof b.properties === "object"
            ? (b.properties as Record<string, unknown>)
            : undefined,
        visitorId: typeof b.visitorId === "string" ? b.visitorId : undefined,
        sessionId: typeof b.sessionId === "string" ? b.sessionId : undefined,
        path: typeof b.path === "string" ? b.path : undefined,
        ts: typeof b.ts === "string" ? b.ts : undefined,
      },
      { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
