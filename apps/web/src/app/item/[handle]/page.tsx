import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { getSessionUser } from "@/lib/auth";
import {
  CONDITION_LABELS,
  formatMinorPrice,
  listingPath,
  shortIdFromHandle,
} from "@/lib/listings";
import { SaveButton } from "./SaveButton";
import { ShareButton } from "./ShareButton";
import { BuyerActions } from "./BuyerActions";
import { ReportButton } from "@/components/ReportButton";

async function loadListing(handle: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("short_id", shortIdFromHandle(handle))
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const listing = await loadListing(handle);
  if (!listing) return { title: "Listing not found" };
  const title = listing.title ?? "Listing";
  const description = listing.description ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}${listingPath(listing)}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const listing = await loadListing(handle);
  if (!listing) notFound();

  const supabase = await createClient();
  const [{ data: seller }, { data: images }, user] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_path, city, country_code")
      .eq("id", listing.seller_id)
      .maybeSingle(),
    supabase
      .from("listing_images")
      .select("id, storage_path, sort_order")
      .eq("listing_id", listing.id)
      .order("sort_order", { ascending: true }),
    getSessionUser(),
  ]);

  // Private bucket → sign for public display (service role, 1h).
  const admin = createServiceSupabaseClient();
  const gallery = await Promise.all(
    (images ?? []).map(async (img) => {
      const { data } = await admin.storage
        .from("listing-images")
        .createSignedUrl(img.storage_path, 60 * 60);
      return { id: img.id, url: data?.signedUrl ?? "" };
    }),
  );

  let isSaved = false;
  if (user) {
    const { data: s } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .maybeSingle();
    isSaved = !!s;
  }

  const sellerName =
    seller?.display_name?.trim() || seller?.username || "A seller";
  const place = [seller?.city, seller?.country_code].filter(Boolean).join(", ");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title ?? undefined,
            description: listing.description ?? undefined,
            image: gallery[0]?.url ? [gallery[0].url] : undefined,
            offers: {
              "@type": "Offer",
              price: (listing.price_amount ?? 0) / 100,
              priceCurrency: listing.currency,
              availability: "https://schema.org/InStock",
            },
          }),
        }}
      />
      {/* Gallery */}
      {gallery.length > 0 ? (
        <div className="mb-6 flex snap-x gap-3 overflow-x-auto">
          {gallery.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.url}
              alt={listing.title ?? ""}
              // First gallery image is the LCP candidate; defer the rest.
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              decoding="async"
              className="h-80 w-auto shrink-0 snap-center rounded-xl border border-[var(--color-line)] object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="mb-6 flex h-56 items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] text-[var(--color-muted)]">
          No photos
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
            {listing.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {listing.condition ? CONDITION_LABELS[listing.condition] : ""}
            {listing.brand ? ` · ${listing.brand}` : ""}
            {listing.model ? ` ${listing.model}` : ""}
          </p>
        </div>
        <div className="whitespace-nowrap text-2xl text-[var(--color-paper)]">
          {formatMinorPrice(listing.price_amount, listing.currency)}
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <SaveButton
          listingId={listing.id}
          initialSaved={isSaved}
          signedIn={!!user}
          next={listingPath(listing)}
        />
        <ShareButton title={listing.title ?? "Once Was Yours"} />
      </div>

      {user && user.id === listing.seller_id ? (
        <Link
          href="/offers"
          className="mt-4 inline-block text-sm text-[var(--color-muted)] underline underline-offset-4"
        >
          Manage offers →
        </Link>
      ) : (
        <BuyerActions
          listingId={listing.id}
          sellerId={listing.seller_id}
          signedIn={!!user}
          next={listingPath(listing)}
        />
      )}

      <p className="mt-2 text-xs text-[var(--color-faint)]">
        Keep payments on Once Was Yours for protection.
      </p>

      {listing.description && (
        <p className="mt-6 whitespace-pre-wrap text-[var(--color-paper)]">
          {listing.description}
        </p>
      )}

      {/* Seller (profile pages arrive later) */}
      <div className="mt-8 border-t border-[var(--color-line)] pt-5 text-sm text-[var(--color-muted)]">
        Sold by <span className="text-[var(--color-paper)]">{sellerName}</span>
        {place ? ` · ${place}` : ""}
      </div>

      <div className="mt-3">
        <ReportButton
          target={{ listingId: listing.id }}
          signedIn={!!user}
          next={listingPath(listing)}
          label="Report this listing"
        />
      </div>

      {/* Story preview + Next Chapter arrive in Phase 4/6 (§3.5). */}
      <div className="mt-6 rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">
        The story behind this object is coming soon.
      </div>
    </main>
  );
}
