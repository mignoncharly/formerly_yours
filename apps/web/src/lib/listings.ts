// Pure listing helpers — safe on both server and client (no server-only imports).
import type { ItemCondition } from "@owy/database/types";

export const CONDITIONS: ItemCondition[] = [
  "new",
  "like_new",
  "very_good",
  "good",
  "fair",
];

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  new: "New",
  like_new: "Like new",
  very_good: "Very good",
  good: "Good",
  fair: "Fair",
};

/** Money is stored in integer minor units (69000 = 690,00 €). Format for display. */
export function formatMinorPrice(
  minor: number | null | undefined,
  currency = "EUR",
  locale = "en-IE",
): string {
  if (minor == null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(minor / 100);
}

/** URL-safe slug from a title (diacritics folded, non-alphanumerics collapsed). */
export function slugify(input: string | null | undefined): string {
  if (!input) return "item";
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "item";
}

/** Canonical SEO path: /item/[slug]-[shortId]. Lookup is by short_id. */
export function listingPath(listing: {
  title: string | null;
  short_id: string;
}): string {
  return `/item/${slugify(listing.title)}-${listing.short_id}`;
}

/** Extract the short_id from an /item/[handle] segment (last dash-part). */
export function shortIdFromHandle(handle: string): string {
  const parts = handle.split("-");
  return parts[parts.length - 1] ?? handle;
}

/** Canonical story path: /story/[slug]-[shortId] (slug from the item title). */
export function storyPath(shortId: string, title: string | null): string {
  return `/story/${slugify(title)}-${shortId}`;
}

/** Canonical chapter path: /chapter/[slug]-[shortId]. */
export function chapterPath(shortId: string, title: string | null): string {
  return `/chapter/${slugify(title)}-${shortId}`;
}
