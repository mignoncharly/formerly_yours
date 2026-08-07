-- 0013_trust_safety.sql
-- Phase 7 — Trust & Safety (implementation plan §7, schema blueprint §28-31).
-- Reports, blocks, staff roles, moderation cases, audit log, and the SECURE
-- staff-only functions that perform sensitive actions. The frontend NEVER
-- decides authorization: moderation/suspension go through SECURITY DEFINER
-- functions that check the caller's role and write an audit trail.

-- =============================================================================
-- 1. Enums + staff roles on profiles (§7.5 — not a bare is_admin boolean).
-- =============================================================================
create type public.report_reason as enum (
  'doxxing',
  'harassment',
  'threat',
  'spam',
  'stolen_item',
  'scam',
  'counterfeit',
  'explicit_content',
  'hate',
  'other'
);

create type public.staff_role as enum (
  'user',
  'support',
  'moderator',
  'admin',
  'super_admin'
);

alter table public.profiles
  add column role public.staff_role not null default 'user';

-- CRITICAL: a user must never escalate their own role or lift their own
-- suspension. RLS lets a user update their own profile row, so lock these two
-- columns at the privilege level — only the service role / SECURITY DEFINER
-- functions may change them.
revoke update (role, is_suspended) on public.profiles from authenticated, anon;

-- =============================================================================
-- 2. blocked_users (blueprint §28) — private to the blocker.
-- =============================================================================
create table public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;

create policy "users read their own blocks"
  on public.blocked_users for select
  to authenticated
  using ((select auth.uid()) = blocker_id);

create policy "users create their own blocks"
  on public.blocked_users for insert
  to authenticated
  with check ((select auth.uid()) = blocker_id);

create policy "users remove their own blocks"
  on public.blocked_users for delete
  to authenticated
  using ((select auth.uid()) = blocker_id);

-- =============================================================================
-- 3. reports (blueprint §29) — typed FKs, exactly one target.
-- =============================================================================
create table public.reports (
  id               uuid primary key default extensions.gen_random_uuid(),
  reporter_id      uuid not null references public.profiles (id) on delete cascade,

  story_id         uuid references public.stories (id) on delete cascade,
  comment_id       uuid references public.comments (id) on delete cascade,
  listing_id       uuid references public.listings (id) on delete cascade,
  chapter_id       uuid references public.next_chapters (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,

  reason           public.report_reason not null,
  details          text,
  status           public.report_status not null default 'open',
  created_at       timestamptz not null default now(),

  check (num_nonnulls(story_id, comment_id, listing_id, chapter_id, reported_user_id) = 1)
);

create index reports_status_idx on public.reports (status);

-- =============================================================================
-- 4. is_staff() — role gate used by RLS and the secure functions.
-- =============================================================================
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('support', 'moderator', 'admin', 'super_admin')
  );
$$;

grant execute on function public.is_staff() to authenticated;

alter table public.reports enable row level security;

create policy "users create their own reports"
  on public.reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

create policy "reporters and staff can read reports"
  on public.reports for select
  to authenticated
  using ((select auth.uid()) = reporter_id or public.is_staff());

-- =============================================================================
-- 5. Non-exposed schemas: private (moderation) + audit (§30, §31).
--    Not in PostgREST's exposed schemas → unreachable from the client. Written
--    only by the secure functions below and read by the moderation app via the
--    service role.
-- =============================================================================
create schema if not exists private;
create schema if not exists audit;

create table private.moderation_cases (
  id                 uuid primary key default extensions.gen_random_uuid(),
  report_id          uuid references public.reports (id) on delete set null,
  content_type       text not null,
  content_id         uuid not null,
  risk_score         numeric(5, 4),
  pii_detected       boolean not null default false,
  harassment_detected boolean not null default false,
  doxxing_risk       boolean not null default false,
  image_risk         boolean not null default false,
  status             text not null default 'open',
  assigned_to        uuid references public.profiles (id),
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz
);

create table audit.events (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- 6. Secure staff actions (§7.4/§7.6). Each verifies is_staff() and writes an
--    audit event (who / what / when / entity / reason).
-- =============================================================================
create or replace function public.moderate_content(
  content_type text,
  content_id   uuid,
  new_status   public.moderation_status,
  reason       text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if content_type = 'story' then
    update public.stories set moderation_status = new_status where id = content_id;
  elsif content_type = 'comment' then
    update public.comments set moderation_status = new_status where id = content_id;
  elsif content_type = 'listing_image' then
    update public.listing_images set moderation_status = new_status where id = content_id;
  elsif content_type = 'chapter_update' then
    update public.chapter_updates set moderation_status = new_status where id = content_id;
  elsif content_type = 'listing' then
    update public.listings
      set status = (case when new_status = 'removed' then 'removed' else 'active' end)::public.listing_status
      where id = content_id;
  else
    raise exception 'unknown content_type %', content_type;
  end if;

  insert into audit.events (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'moderate_content', content_type, content_id,
          jsonb_build_object('new_status', new_status, 'reason', reason));
end;
$$;

create or replace function public.suspend_user(
  target    uuid,
  suspended boolean,
  reason    text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.profiles set is_suspended = suspended where id = target;

  insert into audit.events (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()),
          case when suspended then 'account_suspended' else 'account_unsuspended' end,
          'profile', target, jsonb_build_object('reason', reason));
end;
$$;

create or replace function public.resolve_report(
  in_report  uuid,
  new_status public.report_status,
  reason     text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.reports set status = new_status where id = in_report;

  insert into audit.events (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'resolve_report', 'report', in_report,
          jsonb_build_object('new_status', new_status, 'reason', reason));
end;
$$;

grant execute on function public.moderate_content(text, uuid, public.moderation_status, text) to authenticated;
grant execute on function public.suspend_user(uuid, boolean, text) to authenticated;
grant execute on function public.resolve_report(uuid, public.report_status, text) to authenticated;
