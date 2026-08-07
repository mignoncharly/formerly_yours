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

// ---------------------------------------------------------------------------
// Onboarding (§2.3) — "What brings you here?" then username + country + avatar.
// ---------------------------------------------------------------------------
export const profileIntentSchema = z.enum(["sell", "browse", "both"]);
export type ProfileIntent = z.infer<typeof profileIntentSchema>;

// Public handle: 3–20 chars, lowercase letters/digits/underscore, must start
// with a letter. Case-insensitive uniqueness is enforced by the DB (citext-ish
// lower() index) and the unique constraint.
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(20, "Username must be at most 20 characters.")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Use lowercase letters, numbers and underscores; start with a letter.",
  );

// ISO 3166-1 alpha-2, uppercased.
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Select a valid country.");

export const onboardingSchema = z.object({
  intent: profileIntentSchema,
  username: usernameSchema,
  countryCode: countryCodeSchema,
  avatarPath: z.string().trim().max(512).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// Editable profile fields (§ account page). Only public-safe fields — never
// email/phone/address/DOB/KYC (§2.4).
export const profileUpdateSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().max(60).optional().or(z.literal("")),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  countryCode: countryCodeSchema,
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ---------------------------------------------------------------------------
// Listings / sell flow (§3.2–3.6). Money is handled in integer MINOR units
// (69000 = 690,00 €) everywhere below — never floats.
// ---------------------------------------------------------------------------
export const listingTitleSchema = z
  .string()
  .trim()
  .min(3, "Give your item a title (at least 3 characters).")
  .max(80, "Keep the title under 80 characters.");

// price in minor units: > 0, and a sane ceiling (1,000,000.00 €).
export const priceMinorSchema = z
  .number()
  .int("Price must be a whole number of cents.")
  .positive("Price must be greater than zero.")
  .max(100_000_000, "That price looks too high.");

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

// Draft autosave — every step is optional so a half-finished listing can persist.
export const listingDraftSchema = z.object({
  title: listingTitleSchema.optional().or(z.literal("")),
  categoryId: z.number().int().positive().optional(),
  condition: itemConditionSchema.optional(),
  brand: optionalText(80),
  model: optionalText(80),
  description: optionalText(2000),
  priceMinor: priceMinorSchema.optional(),
  countryCode: countryCodeSchema.optional(),
  city: optionalText(80),
});
export type ListingDraftInput = z.infer<typeof listingDraftSchema>;

// Publish — the core fields the DB CHECK (listings_publishable_chk) requires.
export const listingPublishSchema = z.object({
  title: listingTitleSchema,
  categoryId: z.number().int().positive("Pick a category."),
  condition: itemConditionSchema,
  brand: optionalText(80),
  model: optionalText(80),
  description: optionalText(2000),
  priceMinor: priceMinorSchema,
  countryCode: countryCodeSchema.optional(),
  city: optionalText(80),
});
export type ListingPublishInput = z.infer<typeof listingPublishSchema>;

// Parse a human-typed price ("690", "690,00", "690.5", "1 299,99") into minor
// units. Returns null when it isn't a valid positive amount. Shared by the
// sell form and the server action so both agree on the conversion.
export function parsePriceToMinor(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const minor = Math.round(Number(cleaned) * 100);
  return Number.isFinite(minor) && minor > 0 ? minor : null;
}

export const listingSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  condition: itemConditionSchema.optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  countryCode: countryCodeSchema.optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type ListingSearchInput = z.infer<typeof listingSearchSchema>;

// ---------------------------------------------------------------------------
// Story engine (§4). A story says WHY an object is being sold. Identity
// visibility is independent of story tone (mode). The raw input is retained for
// audit; the AI only rephrases, never invents (§4.4).
// ---------------------------------------------------------------------------
export const reactionTypeSchema = z.enum([
  "dead",
  "red_flag",
  "tea",
  "good_for_you",
  "sending_love",
  "savage",
]);

// AI assistant polish actions (§4.3).
export const aiStoryActionSchema = z.enum([
  "keep",
  "shorter",
  "witty",
  "classy",
  "playful",
]);
export type AiStoryAction = z.infer<typeof aiStoryActionSchema>;

export const storyHeadlineSchema = z.string().trim().max(120);
export const storyBodySchema = z
  .string()
  .trim()
  .min(10, "Tell a little more of the story.")
  .max(4000, "Keep it under 4000 characters.");

// Draft autosave — everything optional.
export const storyDraftSchema = z.object({
  headline: storyHeadlineSchema.optional().or(z.literal("")),
  body: z.string().trim().max(4000).optional().or(z.literal("")),
  mode: storyModeSchema.optional(),
  visibility: identityVisibilitySchema.optional(),
  contextIds: z.array(z.number().int().positive()).max(3).optional(),
});
export type StoryDraftInput = z.infer<typeof storyDraftSchema>;

// Publish — a body is required; up to 3 relationship contexts.
export const storyPublishSchema = z.object({
  headline: storyHeadlineSchema.optional().or(z.literal("")),
  body: storyBodySchema,
  mode: storyModeSchema,
  visibility: identityVisibilitySchema,
  contextIds: z.array(z.number().int().positive()).max(3),
});
export type StoryPublishInput = z.infer<typeof storyPublishSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Say something.").max(1000, "Keep it under 1000 characters."),
  parentCommentId: z.string().uuid().optional(),
});
export type CommentInput = z.infer<typeof commentSchema>;
