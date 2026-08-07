import "server-only";
import type { NextRequest } from "next/server";

// Lightweight in-memory fixed-window rate limiter.
//
// The app runs as a single systemd Node process, so process-local counters are
// enough to stop casual spam/abuse of public endpoints and write-heavy server
// actions. It resets on deploy and is per-instance — if the app is ever scaled
// horizontally, swap this for a Postgres/Redis token bucket behind the same API.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 20_000;

export type RateResult = { ok: boolean; retryAfter: number };

/**
 * Count one hit against `key`. Returns ok=false once more than `limit` hits land
 * inside `windowMs`, with the seconds until the window resets.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  let b = buckets.get(key);

  if (!b || b.resetAt <= now) {
    // New window. Opportunistically evict expired keys so the map can't grow
    // without bound under a spray of unique keys (e.g. spoofed IPs).
    if (buckets.size > MAX_KEYS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
      if (buckets.size > MAX_KEYS) buckets.clear();
    }
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }

  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (nginx sets X-Forwarded-For). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
