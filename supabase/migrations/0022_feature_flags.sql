-- 0022_feature_flags.sql
-- Phase 11 §11.6 — feature flags / experiments.
-- The plan is explicit: variants must NEVER be hardcoded as `if (user.id === …)`.
-- Flags live in the database with a deterministic percentage rollout so the same
-- subject always lands in the same bucket for a given flag.

create table public.feature_flags (
  key             text primary key,
  description     text not null default '',
  enabled         boolean not null default false,
  rollout_percent smallint not null default 0 check (rollout_percent between 0 and 100),
  updated_at      timestamptz not null default now()
);

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function extensions.moddatetime (updated_at);

-- Flags gate client UI and server behaviour, so they are world-readable; only
-- staff/service change them (no client write policy).
alter table public.feature_flags enable row level security;

create policy "feature flags are viewable by everyone"
  on public.feature_flags for select using (true);

-- Deterministic evaluation: enabled AND the subject falls inside the rollout %.
-- Same (flag, subject) => same result; NULL subject buckets as "anon".
create or replace function public.feature_flag_enabled (
  flag_key text,
  subject  uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when not f.enabled            then false
      when f.rollout_percent >= 100 then true
      when f.rollout_percent <= 0   then false
      else (abs(pg_catalog.hashtextextended(flag_key || ':' || coalesce(subject::text, 'anon'), 0)) % 100)
           < f.rollout_percent
    end
    from public.feature_flags f
    where f.key = flag_key
  ), false);
$$;

comment on function public.feature_flag_enabled is
  'Feature flag check (§11.6): enabled AND subject inside the deterministic rollout percentage.';

-- Seed the experiments named in the plan (all OFF until deliberately enabled).
insert into public.feature_flags (key, description) values
  ('feed_algorithm_v2',  'Alternative feed ranking model.'),
  ('ai_story_default',   'Default the story composer to AI-assisted mode.'),
  ('chapter_cta_variant','Variant copy/placement for the Fund My Next Chapter CTA.'),
  ('seller_fee_variant', 'Experimental seller fee schedule.');
