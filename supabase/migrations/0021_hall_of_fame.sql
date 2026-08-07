-- 0021_hall_of_fame.sql
-- Phase 11 §11.3 — Hall of Fame: a public, OPT-IN showcase of the best stories,
-- grouped into curated categories and ranked by signature reactions.
--
-- Design:
--   * opt-in lives on the story (author-controlled) — nothing is showcased
--     without the author choosing to;
--   * categories are seed data (a lookup table), each mapping to a reaction
--     (or overall) plus an optional rolling window;
--   * ranking is a SECURITY DEFINER function so it can aggregate reactions across
--     all users, but it only ever returns published, non-removed, opted-in stories
--     (same visibility rule as the public feed).

-- =============================================================================
-- 1. Opt-in flag on stories (author-controlled via the existing update policy).
-- =============================================================================
alter table public.stories
  add column hall_of_fame_opt_in boolean not null default false;

-- Only opted-in stories are ever scanned; a partial index keeps that cheap.
create index stories_hall_of_fame_idx
  on public.stories (published_at desc)
  where hall_of_fame_opt_in;

-- Ranking counts reactions by type per story.
create index story_reactions_reaction_idx
  on public.story_reactions (reaction, story_id);

-- =============================================================================
-- 2. hall_of_fame_categories — curated buckets (seed data).
--    reaction NULL  => rank by TOTAL reactions ("Story of the Week").
--    window_days NULL => all-time.
-- =============================================================================
create table public.hall_of_fame_categories (
  key         text primary key,
  title       text not null,
  blurb       text not null,
  reaction    public.reaction_type,
  window_days integer check (window_days is null or window_days > 0),
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

alter table public.hall_of_fame_categories enable row level security;

create policy "active hall of fame categories are viewable by everyone"
  on public.hall_of_fame_categories for select using (is_active);

insert into public.hall_of_fame_categories (key, title, blurb, reaction, window_days, sort_order) values
  ('story_of_the_week',        'Story of the Week',       'The stories that moved the most people in the last seven days.', null,           7,   1),
  ('most_savage',              'Most Savage',             'No mercy. The most brutally honest goodbyes.',                   'savage',       30,  2),
  ('best_new_beginning',       'Best New Beginning',      'Objects sold to fund something better. Good for them.',          'good_for_you', 30,  3),
  ('at_least_they_had_taste',  'At Least They Had Taste', 'It ended, but the taste was impeccable.',                        'sending_love', 30,  4),
  ('most_unexpected',          'Most Unexpected',         'The plot twists nobody saw coming.',                             'dead',         30,  5);

-- =============================================================================
-- 3. hall_of_fame(cat_key, lim) — ranked, opted-in stories for one category.
-- =============================================================================
create or replace function public.hall_of_fame (
  cat_key text,
  lim     integer default 12
)
returns table (
  story_id         uuid,
  story_short_id   text,
  headline         text,
  body             text,
  visibility       public.identity_visibility,
  published_at     timestamptz,
  author_id        uuid,
  listing_id       uuid,
  listing_short_id text,
  listing_title    text,
  price_amount     integer,
  currency         char(3),
  metric_count     bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with cat as (
    select reaction, window_days
    from public.hall_of_fame_categories
    where key = cat_key and is_active
  )
  select
    s.id, s.short_id, s.headline, s.body, s.visibility, s.published_at, s.author_id,
    l.id, l.short_id, l.title, l.price_amount, l.currency, rc.cnt
  from cat
  join public.stories s
    on s.hall_of_fame_opt_in
   and s.published_at is not null
   and s.moderation_status <> 'removed'
   and (cat.window_days is null
        or s.published_at >= now() - make_interval(days => cat.window_days))
  join public.listings l on l.id = s.listing_id
  left join lateral (
    select count(*)::bigint as cnt
    from public.story_reactions r
    where r.story_id = s.id
      and (cat.reaction is null or r.reaction = cat.reaction)
  ) rc on true
  where rc.cnt > 0
  order by rc.cnt desc, s.published_at desc
  limit greatest(lim, 0);
$$;

comment on function public.hall_of_fame is
  'Hall of Fame (§11.3): opted-in published stories ranked by a category''s signature reaction (or total reactions).';
