import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedThumbnails } from "@/lib/listing-images";
import { ListingCard } from "@/components/listings/ListingCard";
import { CONDITIONS, CONDITION_LABELS } from "@/lib/listings";
import { COUNTRIES } from "@/lib/countries";
import type { ItemCondition } from "@owy/database/types";

export const metadata: Metadata = {
  title: "Browse",
  description: "Browse objects for sale on Once Was Yours.",
};

const PAGE_SIZE = 24;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== "" ? s.trim() : undefined;
}
function intOrNull(v: string | undefined): number | null {
  if (v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const inputClass =
  "rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-paper)] outline-none focus:border-[color-mix(in_oklab,var(--color-paper)_45%,transparent)]";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = one(sp.q);
  const category = intOrNull(one(sp.category));
  const conditionRaw = one(sp.condition);
  const condition = (CONDITIONS as string[]).includes(conditionRaw ?? "")
    ? (conditionRaw as ItemCondition)
    : null;
  const minEuros = intOrNull(one(sp.minPrice));
  const maxEuros = intOrNull(one(sp.maxPrice));
  const country = one(sp.country)?.toUpperCase() ?? null;
  const page = Math.max(1, intOrNull(one(sp.page)) ?? 1);

  const supabase = await createClient();

  const [{ data: topCategories }, { data: results }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .is("parent_id", null)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.rpc("search_listings", {
      q: q ?? null,
      in_category: category,
      in_condition: condition,
      // URL prices are whole euros; the DB stores integer minor units.
      min_price: minEuros != null ? minEuros * 100 : null,
      max_price: maxEuros != null ? maxEuros * 100 : null,
      in_country: country,
      lim: PAGE_SIZE,
      off: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const listings = results ?? [];
  const thumbs = await getSignedThumbnails(listings.map((l) => l.id));

  const qs = (patch: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const base = { q, category, condition, minPrice: minEuros, maxPrice: maxEuros, country, page };
    for (const [k, v] of Object.entries({ ...base, ...patch })) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `/browse?${s}` : "/browse";
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
          Browse
        </h1>
        <Link href="/saved" className="text-sm text-[var(--color-muted)] underline underline-offset-4">
          ♡ Saved
        </Link>
      </div>

      {/* Filters — plain GET form, works without JS. */}
      <form method="get" className="mb-6 flex flex-wrap items-end gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search title, brand, model…"
          className={`${inputClass} min-w-48 flex-1`}
        />
        <select name="category" defaultValue={category ?? ""} className={inputClass}>
          <option value="">All categories</option>
          {(topCategories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="condition" defaultValue={condition ?? ""} className={inputClass}>
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {CONDITION_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="minPrice"
          min="0"
          defaultValue={minEuros ?? ""}
          placeholder="Min €"
          className={`${inputClass} w-24`}
        />
        <input
          type="number"
          name="maxPrice"
          min="0"
          defaultValue={maxEuros ?? ""}
          placeholder="Max €"
          className={`${inputClass} w-24`}
        />
        <select name="country" defaultValue={country ?? ""} className={inputClass}>
          <option value="">Any country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="owy-btn owy-btn-primary !px-4 !py-2 text-sm">
          Search
        </button>
      </form>

      {listings.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          Nothing matches yet. Try broadening your search.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} thumbnail={thumbs.get(l.id)} />
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link href={qs({ page: page - 1 })} className="text-[var(--color-paper)] underline underline-offset-4">
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {listings.length === PAGE_SIZE ? (
          <Link href={qs({ page: page + 1 })} className="text-[var(--color-paper)] underline underline-offset-4">
            Next →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}
