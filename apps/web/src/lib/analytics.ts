// Lightweight client-side event tracker for Phase 0 validation.
//
// Events are POSTed to /api/events and stored as JSONL on the server. This is
// deliberately dependency-free so it runs self-contained on the VPS; a real
// analytics provider (PostHog, per the plan) can be layered in later without
// changing call sites.

export type OwyEvent =
  // --- The 8 core validation events (implementation plan §0.4) ---
  | "landing_viewed"
  | "seller_cta_clicked"
  | "viewer_cta_clicked"
  | "story_viewed"
  | "story_expanded"
  | "fake_buy_clicked"
  | "waitlist_started"
  | "waitlist_completed"
  // --- Prototype feed signals (extra colour, not required for DoD) ---
  | "feed_opened"
  | "feed_item_viewed"
  | "story_reacted"
  | "story_shared"
  | "next_chapter_viewed"
  | "make_offer_clicked";

const VISITOR_KEY = "owy_visitor_id";
const SESSION_KEY = "owy_session_id";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = uid();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export function track(
  event: OwyEvent,
  properties: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    properties,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    path: window.location.pathname,
    ts: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  // §11.5 — mirror to PostHog when configured (no-op until a key is set), so we
  // keep the self-hosted JSONL log AND get a real product-analytics backend.
  forwardToPostHog(event, payload.properties, payload.visitorId, payload.ts);

  try {
    // sendBeacon survives page unloads (important for CTA click -> navigation).
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/events", blob);
      if (ok) return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* validation analytics are best-effort */
  });
}

// PostHog is gated behind NEXT_PUBLIC_POSTHOG_KEY (like the AI features): absent
// key => this does nothing. Uses the dependency-free HTTP capture endpoint so we
// don't ship posthog-js in the bundle.
function forwardToPostHog(
  event: string,
  properties: Record<string, unknown>,
  distinctId: string,
  ts: string,
): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
  try {
    void fetch(`${host.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $current_url: window.location.href },
        timestamp: ts,
      }),
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    });
  } catch {
    /* best-effort */
  }
}
