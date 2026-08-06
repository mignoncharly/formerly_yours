import { NextRequest, NextResponse } from "next/server";
import { recordWaitlist } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTENTS = new Set(["sell", "browse", "both", "unknown"]);

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
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const intentRaw = typeof b.intent === "string" ? b.intent : "unknown";
  const intent = (INTENTS.has(intentRaw) ? intentRaw : "unknown") as
    | "sell"
    | "browse"
    | "both"
    | "unknown";

  try {
    await recordWaitlist(
      {
        email,
        intent,
        source: typeof b.source === "string" ? b.source : undefined,
        visitorId: typeof b.visitorId === "string" ? b.visitorId : undefined,
      },
      { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
