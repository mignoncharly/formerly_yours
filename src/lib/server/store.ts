import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Self-contained JSONL storage for Phase 0 validation data.
//
// We append newline-delimited JSON to files under FY_DATA_DIR (default ./data).
// This keeps Phase 0 dependency-free and trivially deployable on the Ubuntu
// VPS — point FY_DATA_DIR at a persistent path/volume in production. When we
// reach Phase 1 this is replaced by Supabase.
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.FY_DATA_DIR
  ? path.resolve(process.env.FY_DATA_DIR)
  : path.resolve(process.cwd(), "data");

const EVENTS_FILE = path.join(DATA_DIR, "events.jsonl");
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.jsonl");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function appendLine(file: string, record: unknown): Promise<void> {
  await ensureDir();
  await fs.appendFile(file, JSON.stringify(record) + "\n", "utf8");
}

export interface EventRecord {
  event: string;
  properties?: Record<string, unknown>;
  visitorId?: string;
  sessionId?: string;
  path?: string;
  ts?: string;
}

export async function recordEvent(
  event: EventRecord,
  meta: { ip?: string; userAgent?: string },
): Promise<void> {
  await appendLine(EVENTS_FILE, {
    ...event,
    receivedAt: new Date().toISOString(),
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

export interface WaitlistRecord {
  email: string;
  intent: "sell" | "browse" | "both" | "unknown";
  source?: string;
  visitorId?: string;
}

export async function recordWaitlist(
  record: WaitlistRecord,
  meta: { ip?: string; userAgent?: string },
): Promise<void> {
  await appendLine(WAITLIST_FILE, {
    ...record,
    receivedAt: new Date().toISOString(),
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

async function readLines(file: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((x): x is Record<string, unknown> => x !== null);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export interface ValidationStats {
  generatedAt: string;
  totals: {
    events: number;
    uniqueVisitors: number;
    waitlist: number;
  };
  eventCounts: Record<string, number>;
  waitlistByIntent: Record<string, number>;
  /** The core Phase 0 question: seller intent among visitors. */
  funnel: {
    landingViewed: number;
    sellerCtaClicked: number;
    viewerCtaClicked: number;
    waitlistCompleted: number;
    sellerIntentRate: number; // seller_cta_clicked / landing_viewed
  };
}

export async function readStats(): Promise<ValidationStats> {
  const [events, waitlist] = await Promise.all([
    readLines(EVENTS_FILE),
    readLines(WAITLIST_FILE),
  ]);

  const eventCounts: Record<string, number> = {};
  const visitors = new Set<string>();
  for (const e of events) {
    const name = String(e.event ?? "unknown");
    eventCounts[name] = (eventCounts[name] ?? 0) + 1;
    if (e.visitorId) visitors.add(String(e.visitorId));
  }

  const waitlistByIntent: Record<string, number> = {};
  for (const w of waitlist) {
    const intent = String(w.intent ?? "unknown");
    waitlistByIntent[intent] = (waitlistByIntent[intent] ?? 0) + 1;
  }

  const landingViewed = eventCounts["landing_viewed"] ?? 0;
  const sellerCtaClicked = eventCounts["seller_cta_clicked"] ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      events: events.length,
      uniqueVisitors: visitors.size,
      waitlist: waitlist.length,
    },
    eventCounts,
    waitlistByIntent,
    funnel: {
      landingViewed,
      sellerCtaClicked,
      viewerCtaClicked: eventCounts["viewer_cta_clicked"] ?? 0,
      waitlistCompleted: eventCounts["waitlist_completed"] ?? 0,
      sellerIntentRate: landingViewed > 0 ? sellerCtaClicked / landingViewed : 0,
    },
  };
}
