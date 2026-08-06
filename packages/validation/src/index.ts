import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared Zod schemas. The frontend and API routes validate against the same
// source of truth (implementation plan §16: React Hook Form + Zod).
// ---------------------------------------------------------------------------

export const waitlistIntentSchema = z.enum(["sell", "browse", "both"]);

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  intent: waitlistIntentSchema.default("both"),
  source: z.string().max(64).optional(),
  visitorId: z.string().max(128).optional(),
});
export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const analyticsEventSchema = z.object({
  event: z.string().min(1).max(64),
  properties: z.record(z.string(), z.unknown()).optional(),
  visitorId: z.string().max(128).optional(),
  sessionId: z.string().max(128).optional(),
  path: z.string().max(512).optional(),
  ts: z.string().datetime().optional(),
});
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

// Domain enums re-expressed as runtime validators (kept in sync with @owy/types).
export const storyModeSchema = z.enum(["clean_break", "little_tea", "full_story"]);
export const identityVisibilitySchema = z.enum(["public", "limited", "anonymous"]);
export const itemConditionSchema = z.enum([
  "new",
  "like_new",
  "very_good",
  "good",
  "fair",
]);
