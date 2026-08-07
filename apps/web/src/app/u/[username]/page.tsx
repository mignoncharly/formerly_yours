import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createServiceSupabaseClient } from "@owy/database/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedThumbnails } from "@/lib/listing-images";
import { ListingCard } from "@/components/listings/ListingCard";
import { FollowButton } from "@/app/story/[handle]/FollowButton";
import { BottomNav } from "@/components/BottomNav";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Public, PII-free columns only (profiles never store email/phone/address).
const PUBLIC_COLS =
  "id, username, display_name, bio, country_code, city, is_verified, created_at, deactivated_at, is_suspended";

async function loadProfile(username: string) {
  const admin = createServiceSupabaseClient();
  const { data } = await admin.from("profiles").select(PUBLIC_COLS).ilike("username", username).maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile || profile.deactivated_at || profile.is_suspended) return { title: "Profile not found" };
  const name = profile.display_name?.trim() || profile.username || "A seller";
  return {
    title: `${name} (@${profile.username})`,
    description: profile.bio ?? `${name} on Once Was Yours.`,
    alternates: { canonical: `${APP_URL}/u/${profile.username}` },
    openGraph: { title: name, description: profile.bio ?? undefined, type: "profile" },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile || profile.deactivated_at || profile.is_suspended) notFound();

  const admin = createServiceSupabaseClient();
  const viewer = await getSessionUser();

  // Their public content + social counts, in parallel.
  const [{ data: listings }, { data: stories }, followers, following] = await Promise.all([
    admin
      .from("listings")
      .select("id, short_id, title, price_amount, currency, condition")
      .eq("seller_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(24),
    admin
      .from("stories")
      .select("short_id, headline")
      .eq("author_id", profile.id)
      .eq("visibility", "public") // never surface anonymous/limited stories here
      .not("published_at", "is", null)
      .neq("moderation_status", "removed")
      .order("published_at", { ascending: false })
      .limit(24),
    admin.from("follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", profile.id),
    admin.from("follows").select("followed_id", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);

  const listingRows = listings ?? [];
  const storyRows = stories ?? [];
  const thumbs = await getSignedThumbnails(listingRows.map((l) => l.id));

  // Follow state (only when signed in and viewing someone else).
  let isFollowing = false;
  if (viewer && viewer.id !== profile.id) {
    const supabase = await createClient();
    const { data: f } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", viewer.id)
      .eq("followed_id", profile.id)
      .maybeSingle();
    isFollowing = !!f;
  }

  const name = profile.display_name?.trim() || profile.username || "A seller";
  const initial = (name[0] ?? "?").toUpperCase();
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-8 pb-24">
      <header className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] text-2xl text-[var(--color-paper)]">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
            {name}
            {profile.is_verified ? <span title="Verified" className="text-base text-[var(--color-primary)]">✓</span> : null}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">@{profile.username}</p>
          {profile.bio ? <p className="mt-2 text-sm text-[var(--color-paper)]">{profile.bio}</p> : null}
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            <span className="text-[var(--color-paper)]">{followers.count ?? 0}</span> followers ·{" "}
            <span className="text-[var(--color-paper)]">{following.count ?? 0}</span> following · Joined {joined}
          </p>
        </div>
        {viewer && viewer.id !== profile.id ? (
          <FollowButton
            followedId={profile.id}
            initialFollowing={isFollowing}
            signedIn={!!viewer}
            next={`/u/${profile.username}`}
          />
        ) : null}
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-[var(--color-muted)]">For sale</h2>
        {listingRows.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Nothing listed right now.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {listingRows.map((l) => (
              <ListingCard key={l.id} listing={l} thumbnail={thumbs.get(l.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-[var(--color-muted)]">Stories</h2>
        {storyRows.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No public stories yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-line)]">
            {storyRows.map((s) => (
              <li key={s.short_id}>
                <Link
                  href={`/story/${s.short_id}`}
                  className="block py-3 text-[var(--color-paper)] hover:underline"
                >
                  {s.headline?.trim() || "A story"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
