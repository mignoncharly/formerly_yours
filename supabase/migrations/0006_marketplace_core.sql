-- 0006_marketplace_core.sql
-- Phase 3 — Marketplace Core (implementation plan §3, schema blueprint §6-8, §13).
-- Commerce domain: categories, listings, listing_images, saved_listings.
-- listing ≠ story: NOTHING emotional here (stories arrive in Phase 4). Money is
-- stored in integer minor units (69000 = 690,00 €). RLS on every exposed table.

-- =============================================================================
-- 1. categories (blueprint §6) — seeded catalogue, read-only to clients.
-- =============================================================================
create table public.categories (
  id         bigint generated always as identity primary key,
  parent_id  bigint references public.categories (id),
  slug       text unique not null,
  name       text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

comment on table public.categories is
  'Object taxonomy (top-level + subcategories). Seeded; clients read only.';

create index categories_parent_idx on public.categories (parent_id);

-- =============================================================================
-- 2. listings (blueprint §7) — the product for sale. No story fields here.
--    Draft-first: title/category/condition/price are nullable so an empty draft
--    can be created and saved step by step; a CHECK enforces completeness for
--    any non-draft (published) status.
-- =============================================================================
create table public.listings (
  id           uuid primary key default extensions.gen_random_uuid(),

  seller_id    uuid not null references public.profiles (id) on delete cascade,
  category_id  bigint references public.categories (id),

  -- Short, URL-safe public handle for /item/[slug]-[shortId]. Stable per row.
  short_id     text not null unique
                 default lower(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 10)),

  title        text,
  description  text,
  brand        text,
  model        text,

  condition    public.item_condition,

  currency     char(3) not null default 'EUR',
  price_amount integer check (price_amount is null or price_amount > 0),

  status       public.listing_status not null default 'draft',

  country_code char(2),
  city         text,

  published_at timestamptz,
  sold_at      timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A listing may only leave 'draft' once the core fields are present.
  constraint listings_publishable_chk check (
    status = 'draft'
    or (title is not null
        and category_id is not null
        and condition is not null
        and price_amount is not null)
  )
);

comment on table public.listings is
  'A product for sale. listing ≠ story (Phase 4). Amounts in integer minor units.';

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function extensions.moddatetime (updated_at);

create index listings_seller_idx    on public.listings (seller_id);
create index listings_category_idx  on public.listings (category_id);
create index listings_status_idx    on public.listings (status);
create index listings_published_idx on public.listings (published_at desc);

-- Full-text search over the non-emotional product fields (§3.6). 'simple'
-- config = language-agnostic, no stemming surprises across EN/FR/DE listings.
alter table public.listings
  add column search_tsv tsvector
  generated always as (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(brand, '') || ' ' ||
      coalesce(model, '') || ' ' ||
      coalesce(description, ''))
  ) stored;

create index listings_search_idx on public.listings using gin (search_tsv);
-- Trigram index for fuzzy / prefix title matches (typos, partial words).
create index listings_title_trgm_idx on public.listings using gin (title extensions.gin_trgm_ops);

-- =============================================================================
-- 3. listing_images (blueprint §8) — private storage paths, never a public URL.
--    Each image is moderated (pending → approved). EXIF/GPS stripped client-side
--    before upload (§3.4) and re-verified server-side.
-- =============================================================================
create table public.listing_images (
  id                uuid primary key default extensions.gen_random_uuid(),
  listing_id        uuid not null references public.listings (id) on delete cascade,
  storage_path      text not null,
  sort_order        integer not null default 0,
  moderation_status public.moderation_status not null default 'pending',
  width             integer,
  height            integer,
  created_at        timestamptz not null default now()
);

comment on table public.listing_images is
  'Listing photos. Store bucket/path only (never a permanent public URL).';

create index listing_images_listing_idx
  on public.listing_images (listing_id, sort_order);

-- =============================================================================
-- 4. saved_listings (blueprint §13) — a buyer's ♡ saved items (§3.7).
-- =============================================================================
create table public.saved_listings (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

comment on table public.saved_listings is 'Buyer-saved listings (♡).';

create index saved_listings_listing_idx on public.saved_listings (listing_id);

-- =============================================================================
-- 5. RLS (§2.5) — the frontend NEVER decides authorization.
-- =============================================================================

-- categories: anyone reads active rows; no client writes (seeded / admin only).
alter table public.categories enable row level security;

create policy "active categories are viewable by everyone"
  on public.categories for select
  using (is_active);

-- listings: active listings are public; a seller has full control of their own
-- rows in any status (drafts included).
alter table public.listings enable row level security;

create policy "active listings are viewable by everyone"
  on public.listings for select
  using (status = 'active');

create policy "sellers can view their own listings"
  on public.listings for select
  to authenticated
  using ((select auth.uid()) = seller_id);

create policy "sellers can create their own listings"
  on public.listings for insert
  to authenticated
  with check ((select auth.uid()) = seller_id);

create policy "sellers can update their own listings"
  on public.listings for update
  to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

create policy "sellers can delete their own listings"
  on public.listings for delete
  to authenticated
  using ((select auth.uid()) = seller_id);

-- listing_images: visible when the parent listing is visible; only the owning
-- seller may write.
alter table public.listing_images enable row level security;

create policy "listing images follow listing visibility"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.seller_id = (select auth.uid()))
    )
  );

create policy "sellers manage their own listing images (insert)"
  on public.listing_images for insert
  to authenticated
  with check (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.seller_id = (select auth.uid()))
  );

create policy "sellers manage their own listing images (update)"
  on public.listing_images for update
  to authenticated
  using (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.seller_id = (select auth.uid()))
  );

create policy "sellers manage their own listing images (delete)"
  on public.listing_images for delete
  to authenticated
  using (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.seller_id = (select auth.uid()))
  );

-- saved_listings: a user only ever sees/writes their own saves.
alter table public.saved_listings enable row level security;

create policy "users read their own saves"
  on public.saved_listings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users add their own saves"
  on public.saved_listings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users remove their own saves"
  on public.saved_listings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- 6. search_listings(...) — the single search entry point (§3.6). SECURITY
--    INVOKER (default) so RLS still applies: anon/other users only ever see
--    'active' rows. Ranked by text relevance, then most recently published.
-- =============================================================================
create or replace function public.search_listings (
  q            text default null,
  in_category  bigint default null,
  in_condition public.item_condition default null,
  min_price    integer default null,
  max_price    integer default null,
  in_country   char(2) default null,
  lim          integer default 40,
  off          integer default 0
)
returns setof public.listings
language sql
stable
set search_path = ''
as $$
  select l.*
  from public.listings l
  where l.status = 'active'
    and (q is null or q = '' or l.search_tsv @@ websearch_to_tsquery('simple', q))
    and (in_category  is null or l.category_id = in_category)
    and (in_condition is null or l.condition = in_condition)
    and (min_price    is null or l.price_amount >= min_price)
    and (max_price    is null or l.price_amount <= max_price)
    and (in_country   is null or l.country_code = in_country)
  order by
    case when q is null or q = '' then 0
         else ts_rank(l.search_tsv, websearch_to_tsquery('simple', q)) end desc,
    l.published_at desc nulls last
  limit greatest(lim, 0)
  offset greatest(off, 0);
$$;

comment on function public.search_listings is
  'Public marketplace search over active listings (RLS-enforced). §3.6.';
