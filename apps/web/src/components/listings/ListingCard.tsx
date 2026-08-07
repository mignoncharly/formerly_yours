import Link from "next/link";
import type { ItemCondition } from "@owy/database/types";
import { CONDITION_LABELS, formatMinorPrice, listingPath } from "@/lib/listings";

export type ListingCardData = {
  short_id: string;
  title: string | null;
  price_amount: number | null;
  currency: string;
  condition: ItemCondition | null;
};

export function ListingCard({
  listing,
  thumbnail,
}: {
  listing: ListingCardData;
  thumbnail?: string;
}) {
  return (
    <Link href={listingPath(listing)} className="group block">
      <div className="aspect-square overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={listing.title ?? ""}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
            No photo
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-sm text-[var(--color-paper)]">
          {listing.title ?? "Untitled"}
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          {formatMinorPrice(listing.price_amount, listing.currency)}
          {listing.condition ? ` · ${CONDITION_LABELS[listing.condition]}` : ""}
        </p>
      </div>
    </Link>
  );
}
