-- 0011_social_feed.sql
-- Phase 5 — Social Feed (implementation plan §5, schema blueprint §14).
-- follows (follow a seller/storyteller) + the feed ranking function.

-- =============================================================================
-- 1. follows (blueprint §14) — follow a PROFILE, not an individual story.
-- =============================================================================
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index follows_followed_idx on public.follows (followed_id);

-- The follow graph is public (follower/following counts are public), but only
-- the follower can create/remove their own edges.
alter table public.follows enable row level security;

create policy "follows are viewable by everyone"
  on public.follows for select using (true);

create policy "users create their own follows"
  on public.follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

create policy "users remove their own follows"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

-- =============================================================================
-- 2. feed_stories(...) — the ranked story feed (§5.3).
--    score = 0.30 recency + 0.20 reactions + 0.15 comments + 0.15 saves
--          + 0.10 follow-affinity   (shares are not yet tracked → 0.10 unused).
--    Counts are aggregated across all users, so this is SECURITY DEFINER; it
--    only ever returns PUBLISHED, non-removed stories (same as public read).
-- =============================================================================
create or replace function public.feed_stories (
  viewer         uuid default null,
  following_only boolean default false,
  lim            integer default 20,
  off            integer default 0
)
returns table (
  story_id        uuid,
  story_short_id  text,
  headline        text,
  body            text,
  visibility      public.identity_visibility,
  published_at    timestamptz,
  author_id       uuid,
  listing_id      uuid,
  listing_short_id text,
  listing_title   text,
  price_amount    integer,
  currency        char(3),
  reaction_count  bigint,
  comment_count   bigint,
  save_count      bigint,
  score           double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id, s.short_id, s.headline, s.body, s.visibility, s.published_at, s.author_id,
    l.id, l.short_id, l.title, l.price_amount, l.currency,
    coalesce(rc.cnt, 0), coalesce(cc.cnt, 0), coalesce(sc.cnt, 0),
    ( 0.30 * (1.0 / (1 + extract(epoch from (now() - s.published_at)) / 86400.0))
      + 0.20 * least(ln(1 + coalesce(rc.cnt, 0)) / ln(50), 1)
      + 0.15 * least(ln(1 + coalesce(cc.cnt, 0)) / ln(50), 1)
      + 0.15 * least(ln(1 + coalesce(sc.cnt, 0)) / ln(50), 1)
      + 0.10 * (case when f.follower_id is not null then 1 else 0 end)
    )::double precision as score
  from public.stories s
  join public.listings l on l.id = s.listing_id
  left join lateral (
    select count(*)::bigint cnt from public.story_reactions r where r.story_id = s.id
  ) rc on true
  left join lateral (
    select count(*)::bigint cnt from public.comments c
    where c.story_id = s.id and c.moderation_status <> 'removed'
  ) cc on true
  left join lateral (
    select count(*)::bigint cnt from public.saved_listings sv where sv.listing_id = l.id
  ) sc on true
  left join public.follows f
    on f.followed_id = s.author_id and f.follower_id = viewer
  where s.published_at is not null
    and s.moderation_status <> 'removed'
    and (not following_only or f.follower_id is not null)
  order by score desc, s.published_at desc
  limit greatest(lim, 0)
  offset greatest(off, 0);
$$;

comment on function public.feed_stories is
  'Ranked social feed of published stories (§5.3). following_only filters to the viewer''s follows.';
