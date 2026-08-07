-- 0012_next_chapter.sql
-- Phase 6 — Fund My Next Chapter (implementation plan §6, schema blueprint §15-18).
-- The second differentiator: a real sale funds the seller's future. Until real
-- payments exist (Phase 9), progress is a SIMULATION computed from SOLD listings
-- linked to a chapter (next_chapters.is_simulated = true). We never store a
-- mutable `current_amount`; progress is always derived (§17).
-- chapter_contributions (§17) is intentionally deferred — it references
-- order_items, which arrives with transactions in Phase 8/9.

-- =============================================================================
-- 1. next_chapters (blueprint §15) — what the money is for.
-- =============================================================================
create table public.next_chapters (
  id            uuid primary key default extensions.gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,

  short_id      text not null unique
                  default lower(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 10)),

  title         text not null,
  description   text,
  target_amount integer check (target_amount is null or target_amount > 0),
  currency      char(3) not null default 'EUR',

  visibility    public.identity_visibility not null default 'public',
  status        public.chapter_status not null default 'active',
  is_simulated  boolean not null default true,

  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.next_chapters is
  'A funding goal for the seller''s future. Progress is derived from sold linked listings, not a stored counter (§17). is_simulated until real payments (Phase 9).';

create trigger next_chapters_set_updated_at
  before update on public.next_chapters
  for each row execute function extensions.moddatetime (updated_at);

create index next_chapters_owner_idx on public.next_chapters (owner_id);

-- =============================================================================
-- 2. listing_chapters (blueprint §16) — a listing funds at most one chapter.
-- =============================================================================
create table public.listing_chapters (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  chapter_id uuid not null references public.next_chapters (id) on delete cascade
);

create index listing_chapters_chapter_idx on public.listing_chapters (chapter_id);

-- =============================================================================
-- 3. chapter_updates (blueprint §18) — "What happened next?"
-- =============================================================================
create table public.chapter_updates (
  id                uuid primary key default extensions.gen_random_uuid(),
  chapter_id        uuid not null references public.next_chapters (id) on delete cascade,
  author_id         uuid not null references public.profiles (id) on delete cascade,
  body              text not null,
  image_path        text,
  moderation_status public.moderation_status not null default 'approved',
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index chapter_updates_chapter_idx on public.chapter_updates (chapter_id, created_at);

-- =============================================================================
-- 4. RLS
-- =============================================================================
alter table public.next_chapters enable row level security;

create policy "public chapters are viewable by everyone"
  on public.next_chapters for select
  using (visibility = 'public' and status <> 'archived');

create policy "owners view their own chapters"
  on public.next_chapters for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "owners create their own chapters"
  on public.next_chapters for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "owners update their own chapters"
  on public.next_chapters for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owners delete their own chapters"
  on public.next_chapters for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- listing_chapters: public for public chapters; only the owner (of both the
-- listing and the chapter) links/unlinks.
alter table public.listing_chapters enable row level security;

create policy "links on public chapters are viewable"
  on public.listing_chapters for select
  using (
    exists (
      select 1 from public.next_chapters c
      where c.id = chapter_id
        and ((c.visibility = 'public' and c.status <> 'archived')
             or c.owner_id = (select auth.uid()))
    )
  );

create policy "owners link their own listing to their own chapter"
  on public.listing_chapters for insert
  to authenticated
  with check (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.seller_id = (select auth.uid()))
    and exists (select 1 from public.next_chapters c
                where c.id = chapter_id and c.owner_id = (select auth.uid()))
  );

create policy "owners unlink their own listing"
  on public.listing_chapters for delete
  to authenticated
  using (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.seller_id = (select auth.uid()))
  );

-- chapter_updates: visible on visible chapters; author writes.
alter table public.chapter_updates enable row level security;

create policy "updates on visible chapters are readable"
  on public.chapter_updates for select
  using (
    moderation_status <> 'removed'
    and exists (
      select 1 from public.next_chapters c
      where c.id = chapter_id
        and ((c.visibility = 'public' and c.status <> 'archived')
             or c.owner_id = (select auth.uid()))
    )
  );

create policy "owners post updates to their own chapter"
  on public.chapter_updates for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (select 1 from public.next_chapters c
                where c.id = chapter_id and c.owner_id = (select auth.uid()))
  );

create policy "authors edit their own updates"
  on public.chapter_updates for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "authors delete their own updates"
  on public.chapter_updates for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- =============================================================================
-- 5. chapter_progress(chapter) — derived progress (§17). SECURITY DEFINER so it
--    can count SOLD listings (which RLS otherwise hides from the public). Until
--    real payments, "sold" is set manually → the chapter is flagged simulated.
-- =============================================================================
create or replace function public.chapter_progress(in_chapter uuid)
returns table (raised bigint, items_sold bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum(l.price_amount), 0)::bigint as raised,
    count(*)::bigint as items_sold
  from public.listing_chapters lc
  join public.listings l on l.id = lc.listing_id
  where lc.chapter_id = in_chapter
    and l.status = 'sold';
$$;

comment on function public.chapter_progress is
  'Derived funding progress for a chapter: sum(price) and count of SOLD linked listings (§17).';
