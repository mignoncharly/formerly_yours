-- 0009_story_engine.sql
-- Phase 4 — Story Engine (implementation plan §4, schema blueprint §9-12).
-- This is the product's real differentiator: a listing can carry ONE story that
-- says WHY the object exists on the platform. story ≠ listing — a story can be
-- hidden without pulling the item, and vice-versa. All enums live in 0002.
--
-- Trust & safety: "Tell your story. Never expose theirs." The raw user words are
-- retained separately (stories.original_input) for audit/moderation; identity can
-- be public / limited / anonymous, independent of story tone (mode).

-- =============================================================================
-- 1. relationship_contexts (blueprint §10) — structured "why", not free text.
-- =============================================================================
create table public.relationship_contexts (
  id           smallint generated always as identity primary key,
  slug         text unique not null,
  label        text not null,
  emoji        text,
  is_sensitive boolean not null default false,
  sort_order   integer not null default 0,
  is_active    boolean not null default true
);

comment on table public.relationship_contexts is
  'Structured breakup/relationship contexts (seeded). Enables analytics, i18n, moderation — never free text like "cheated on me".';

-- =============================================================================
-- 2. stories (blueprint §9) — one per listing (listing_id unique).
-- =============================================================================
create table public.stories (
  id                uuid primary key default extensions.gen_random_uuid(),
  listing_id        uuid not null unique references public.listings (id) on delete cascade,
  author_id         uuid not null references public.profiles (id) on delete cascade,

  short_id          text not null unique
                      default lower(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 10)),

  mode              public.story_mode not null default 'clean_break',
  visibility        public.identity_visibility not null default 'public',

  headline          text,
  body              text,

  -- §4.3/§4.4 — the user's own words, kept apart from any AI-polished body for
  -- audit & moderation. AI never invents; it only rephrases what's here.
  original_input    text,
  ai_assisted       boolean not null default false,

  moderation_status public.moderation_status not null default 'approved',
  published_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.stories is
  'One story per listing (why the object is being sold). original_input kept for audit; body may be AI-rephrased. Public only once published_at is set.';

create trigger stories_set_updated_at
  before update on public.stories
  for each row execute function extensions.moddatetime (updated_at);

create index stories_author_idx on public.stories (author_id);
create index stories_published_idx on public.stories (published_at desc);

-- =============================================================================
-- 3. story_relationship_contexts (blueprint §10) — N:N (a story can be
--    "divorce" + "moving_out").
-- =============================================================================
create table public.story_relationship_contexts (
  story_id   uuid not null references public.stories (id) on delete cascade,
  context_id smallint not null references public.relationship_contexts (id),
  primary key (story_id, context_id)
);

-- =============================================================================
-- 4. story_reactions (blueprint §11) — signature reactions, one per user/story.
-- =============================================================================
create table public.story_reactions (
  story_id   uuid not null references public.stories (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  reaction   public.reaction_type not null,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index story_reactions_story_idx on public.story_reactions (story_id);

-- =============================================================================
-- 5. comments (blueprint §12) — one reply level (enforced app-side).
-- =============================================================================
create table public.comments (
  id                uuid primary key default extensions.gen_random_uuid(),
  story_id          uuid not null references public.stories (id) on delete cascade,
  author_id         uuid not null references public.profiles (id) on delete cascade,
  parent_comment_id uuid references public.comments (id) on delete cascade,
  body              text not null,
  moderation_status public.moderation_status not null default 'approved',
  created_at        timestamptz not null default now(),
  edited_at         timestamptz
);

create index comments_story_idx on public.comments (story_id, created_at);

-- =============================================================================
-- 6. RLS — the frontend never decides authorization.
-- =============================================================================

-- relationship_contexts: read-only catalogue.
alter table public.relationship_contexts enable row level security;
create policy "active contexts are viewable by everyone"
  on public.relationship_contexts for select using (is_active);

-- stories: public once published; author controls their own in any state. A
-- story can only be authored by the seller who owns the listing.
alter table public.stories enable row level security;

create policy "published stories are viewable by everyone"
  on public.stories for select
  using (published_at is not null and moderation_status <> 'removed');

create policy "authors can view their own stories"
  on public.stories for select
  to authenticated
  using ((select auth.uid()) = author_id);

create policy "sellers author stories for their own listing"
  on public.stories for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  );

create policy "authors update their own stories"
  on public.stories for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "authors delete their own stories"
  on public.stories for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- helper: is a story readable by the current caller (published, or theirs)?
create or replace function public.story_is_visible(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stories s
    where s.id = sid
      and (
        (s.published_at is not null and s.moderation_status <> 'removed')
        or s.author_id = (select auth.uid())
      )
  );
$$;

-- story_relationship_contexts: follow story visibility; author writes.
alter table public.story_relationship_contexts enable row level security;

create policy "story tags follow story visibility"
  on public.story_relationship_contexts for select
  using (public.story_is_visible(story_id));

create policy "authors tag their own story (insert)"
  on public.story_relationship_contexts for insert
  to authenticated
  with check (
    exists (select 1 from public.stories s
            where s.id = story_id and s.author_id = (select auth.uid()))
  );

create policy "authors untag their own story (delete)"
  on public.story_relationship_contexts for delete
  to authenticated
  using (
    exists (select 1 from public.stories s
            where s.id = story_id and s.author_id = (select auth.uid()))
  );

-- story_reactions: readable on visible stories; a user owns their own reaction.
alter table public.story_reactions enable row level security;

create policy "reactions on visible stories are readable"
  on public.story_reactions for select
  using (public.story_is_visible(story_id));

create policy "users add their own reaction"
  on public.story_reactions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users change their own reaction"
  on public.story_reactions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users remove their own reaction"
  on public.story_reactions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- comments: readable on visible stories (unless removed); author owns theirs.
alter table public.comments enable row level security;

create policy "comments on visible stories are readable"
  on public.comments for select
  using (moderation_status <> 'removed' and public.story_is_visible(story_id));

create policy "authors write their own comments"
  on public.comments for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id and public.story_is_visible(story_id)
  );

create policy "authors edit their own comments"
  on public.comments for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "authors delete their own comments"
  on public.comments for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- =============================================================================
-- 7. story_reaction_counts(story) — aggregated signature reactions for a story.
-- =============================================================================
create or replace function public.story_reaction_counts(in_story uuid)
returns table (reaction public.reaction_type, count bigint)
language sql
stable
set search_path = ''
as $$
  select r.reaction, count(*)::bigint
  from public.story_reactions r
  where r.story_id = in_story
  group by r.reaction;
$$;

comment on function public.story_reaction_counts is
  'Reaction tallies for a story (RLS-enforced via story_reactions read policy).';
