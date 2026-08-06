-- 0003_profiles.sql
-- Phase 2 — Identity. Public profile rows bootstrapped from auth.users, with
-- RLS. Private/sensitive seller data (KYC, Stripe, tax) is intentionally NOT
-- here — it lands in a private schema when selling arrives (Phase 3/9).

-- 1. profiles (schema blueprint §4) — only public-safe fields live here.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  username text unique,
  display_name text,
  avatar_path text,
  bio text,

  country_code char(2),
  city text,

  onboarded_at timestamptz,
  is_verified boolean not null default false,
  is_suspended boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Public user profile. Never store email/phone/address/DOB/KYC here.';

-- keep updated_at fresh
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function extensions.moddatetime (updated_at);

-- 2. Bootstrap a profile whenever a Supabase auth user is created (§2.2).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 3. RLS (§2.5). Every exposed table has RLS; policies are explicitly authed.
alter table public.profiles enable row level security;

-- Public fields are readable by anyone (username/display_name/avatar/bio/city).
create policy "profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

-- A user may update only their own profile.
create policy "users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Insert is handled by the bootstrap trigger (security definer); allow a user to
-- (re)create their own row defensively, but never someone else's.
create policy "users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Helpful indexes for lookups.
create index profiles_username_idx on public.profiles (username);
