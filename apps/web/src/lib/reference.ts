// Reference/lookup data shared across the prototype (kept out of free text so
// that analytics, translation and moderation stay possible later).

import type {
  CategorySlug,
  ItemCondition,
  ReactionKey,
  RelationshipContextSlug,
  StoryMode,
} from "@owy/types";

export const REACTIONS: {
  key: ReactionKey;
  emoji: string;
  label: string;
}[] = [
  { key: "dead", emoji: "💀", label: "Dead" },
  { key: "red_flag", emoji: "🚩", label: "Red Flag" },
  { key: "tea", emoji: "🍵", label: "Tea" },
  { key: "good_for_you", emoji: "👏", label: "Good for you" },
  { key: "sending_love", emoji: "❤️", label: "Sending love" },
  { key: "savage", emoji: "🔥", label: "Savage" },
];

export const RELATIONSHIP_CONTEXTS: Record<
  RelationshipContextSlug,
  { label: string; emoji: string; sensitive: boolean }
> = {
  cheated_on: { label: "Cheated On", emoji: "💔", sensitive: true },
  ghosted: { label: "Ghosted", emoji: "👻", sensitive: false },
  wedding_cancelled: { label: "Wedding Cancelled", emoji: "💍", sensitive: true },
  divorce: { label: "Divorce", emoji: "⚖️", sensitive: true },
  moving_out: { label: "Moving Out", emoji: "🏠", sensitive: false },
  peaceful_goodbye: { label: "Peaceful Goodbye", emoji: "🌱", sensitive: false },
  terrible_gift: { label: "Terrible Gift", emoji: "🎁", sensitive: false },
  at_least_they_had_taste: {
    label: "At Least They Had Taste",
    emoji: "💎",
    sensitive: false,
  },
  what_was_i_thinking: { label: "What Was I Thinking", emoji: "🤡", sensitive: false },
  red_flags: { label: "Red Flags", emoji: "🚩", sensitive: false },
  other: { label: "Other", emoji: "•", sensitive: false },
};

export const STORY_MODES: Record<StoryMode, { label: string; emoji: string }> = {
  clean_break: { label: "Clean Break", emoji: "🧘" },
  little_tea: { label: "A Little Tea", emoji: "🙂" },
  full_story: { label: "Full Story", emoji: "🍿" },
};

export const CATEGORIES: Record<CategorySlug, string> = {
  fashion: "Fashion",
  electronics: "Electronics",
  jewelry: "Jewelry",
  luxury: "Luxury",
  home: "Home",
  gaming: "Gaming",
  wedding: "Wedding",
  travel: "Travel",
  collectibles: "Collectibles",
  other: "Other",
};

export const CONDITIONS: Record<ItemCondition, string> = {
  new: "New",
  like_new: "Like new",
  very_good: "Very good",
  good: "Good",
  fair: "Fair",
};

/** Format integer minor units into a display string, e.g. 69000 -> "€690". */
export function formatMoney(amountMinor: number, currency = "EUR"): string {
  const symbol = currency === "EUR" ? "€" : "";
  const major = amountMinor / 100;
  // No decimals when whole, to keep the feed cards clean.
  const value = Number.isInteger(major)
    ? major.toLocaleString("en-GB")
    : major.toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `${symbol}${value}`;
}
