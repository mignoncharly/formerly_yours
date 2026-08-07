import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/server/store";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`events:${ip}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

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
      { ip, userAgent: req.headers.get("user-agent") ?? undefined },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
