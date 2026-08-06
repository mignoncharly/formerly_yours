// ---------------------------------------------------------------------------
// Phase 0 domain types.
//
// These intentionally mirror the vocabulary of the real schema blueprint
// (listing vs story vs next_chapter, integer *minor units* for money, story
// modes + identity visibility) so that the validation prototype speaks the
// same language as the eventual product — without any real backend.
// ---------------------------------------------------------------------------

export type CurrencyCode = "EUR";

/** Money is always stored in integer minor units (69000 = 690,00 €). */
export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export type ItemCondition =
  | "new"
  | "like_new"
  | "very_good"
  | "good"
  | "fair";

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

/** A prototype feed item = a listing that carries a story (Phase 0 fixture). */
export interface FeedItem {
  id: string;
  slug: string;
  title: string;
  category: CategorySlug;
  condition: ItemCondition;
  price: Money;
  /** Emoji stand-ins for real photography in the fake prototype. */
  photo: string;
  accent: string; // hex used for the card's gradient
  seller: SellerPreview;
  story: Story;
  reactions: Record<ReactionKey, number>;
  comments: number;
  nextChapter?: NextChapterPreview;
  /** "Past Sold" — this item already funded a chapter. */
  pastSold?: boolean;
}
