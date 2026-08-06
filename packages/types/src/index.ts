// ---------------------------------------------------------------------------
// Shared domain vocabulary for Once Was Yours.
//
// Mirrors the schema blueprint (listing vs story vs next_chapter, integer
// *minor units* for money, story modes + identity visibility). Consumed by the
// web app today and by the admin app / database package as the monorepo grows.
// ---------------------------------------------------------------------------

export type CurrencyCode = "EUR";

/** Money is always stored in integer minor units (69000 = 690,00 €). */
export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export type ItemCondition = "new" | "like_new" | "very_good" | "good" | "fair";

/** How much of the backstory the seller chose to tell. */
export type StoryMode = "clean_break" | "little_tea" | "full_story";

/** Identity visibility is orthogonal to story mode (a Full Story can be Anonymous). */
export type IdentityVisibility = "public" | "limited" | "anonymous";

/** Curated, non-free-text relationship contexts (slugs). */
export type RelationshipContextSlug =
  | "cheated_on"
  | "ghosted"
  | "wedding_cancelled"
  | "divorce"
  | "moving_out"
  | "peaceful_goodbye"
  | "terrible_gift"
  | "at_least_they_had_taste"
  | "what_was_i_thinking"
  | "red_flags"
  | "other";

/** Culture-specific reactions — not just "like". */
export type ReactionKey =
  | "dead"
  | "red_flag"
  | "tea"
  | "good_for_you"
  | "sending_love"
  | "savage";

export type CategorySlug =
  | "fashion"
  | "electronics"
  | "jewelry"
  | "luxury"
  | "home"
  | "gaming"
  | "wedding"
  | "travel"
  | "collectibles"
  | "other";

/** Lifecycle statuses (from the blueprint state machines). */
export type ListingStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "reserved"
  | "sold"
  | "paused"
  | "rejected"
  | "removed";

export type ModerationStatus =
  | "pending"
  | "approved"
  | "needs_changes"
  | "rejected"
  | "removed";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "awaiting_shipping"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded";

export type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired";

export type ChapterStatus = "active" | "completed" | "paused" | "archived";

export type WaitlistIntent = "sell" | "browse" | "both" | "unknown";

export interface SellerPreview {
  /** First name / handle only — we minimise exposed personal data by design. */
  name: string;
  city: string;
  countryCode: string;
  verified: boolean;
  rating: number; // 0..5
  sold: number;
}

export interface NextChapterPreview {
  emoji: string;
  title: string;
  raised: Money;
  target: Money;
}

export interface Story {
  mode: StoryMode;
  visibility: IdentityVisibility;
  headline: string;
  body: string;
  contexts: RelationshipContextSlug[];
}

/** A prototype feed item = a listing that carries a story. */
export interface FeedItem {
  id: string;
  slug: string;
  title: string;
  category: CategorySlug;
  condition: ItemCondition;
  price: Money;
  photo: string;
  accent: string;
  seller: SellerPreview;
  story: Story;
  reactions: Record<ReactionKey, number>;
  comments: number;
  nextChapter?: NextChapterPreview;
  pastSold?: boolean;
}
