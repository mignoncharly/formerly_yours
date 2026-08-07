import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSignedThumbnails } from "@/lib/listing-images";
import { ListingCard } from "@/components/listings/ListingCard";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function loadCategory(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await loadCategory(slug);
  if (!cat) return { title: "Category not found" };
  const title = `${cat.name} — Once Was Yours`;
  const description = `Buy ${cat.name.toLowerCase()} with a story on Once Was Yours. Sell the past, fund what's next.`;
  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/category/${cat.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = await loadCategory(slug);
  if (!cat) notFound();

  const supabase = await createClient();
  const { data: results } = await supabase.rpc("search_listings", {
    in_category: cat.id,
    lim: 48,
    off: 0,
  });
  const listings = results ?? [];
  const thumbs = await getSignedThumbnails(listings.map((l) => l.id));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-5 py-8">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        {cat.name}
      </h1>
      {listings.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          Nothing here yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} thumbnail={thumbs.get(l.id)} />
          ))}
        </div>
      )}
    </main>
  );
}
