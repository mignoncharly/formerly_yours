-- 0015_messaging_offers.sql
-- Phase 8 — Messaging + Offers (implementation plan §8, schema blueprint §19, §25-27).
-- Buyer<->seller conversations (realtime) and negotiable offers with an ATOMIC
-- accept. Sensitive state transitions go through SECURITY DEFINER functions.

-- =============================================================================
-- 1. offers (blueprint §19, + counter support). proposed_by = who made this
--    offer; a counter is a new offer proposed by the other party.
-- =============================================================================
create table public.offers (
  id              uuid primary key default extensions.gen_random_uuid(),
  listing_id      uuid not null references public.listings (id) on delete cascade,
  buyer_id        uuid not null references public.profiles (id) on delete cascade,
  seller_id       uuid not null references public.profiles (id) on delete cascade,
  proposed_by     uuid not null references public.profiles (id) on delete cascade,
  parent_offer_id uuid references public.offers (id) on delete set null,
  amount          integer not null check (amount > 0),
  status          public.offer_status not null default 'pending',
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function extensions.moddatetime (updated_at);

create index offers_listing_idx on public.offers (listing_id, status);
create index offers_buyer_idx on public.offers (buyer_id);
create index offers_seller_idx on public.offers (seller_id);

alter table public.offers enable row level security;

create policy "offer parties can read the offer"
  on public.offers for select
  to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

-- A buyer opens negotiation: they are buyer + proposer, and seller_id must be
-- the listing's active seller. Counters are created by counter_offer() (definer).
create policy "buyers make offers on active listings"
  on public.offers for insert
  to authenticated
  with check (
    (select auth.uid()) = buyer_id
    and (select auth.uid()) = proposed_by
    and buyer_id <> seller_id
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = offers.seller_id and l.status = 'active'
    )
  );

-- =============================================================================
-- 2. conversations / members / messages (blueprint §25-27).
-- =============================================================================
create table public.conversations (
  id         uuid primary key default extensions.gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id              uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text,
  attachment_path text,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- membership helper (avoids recursive RLS on conversation_members).
create or replace function public.is_conversation_member(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conv and m.user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated;

alter table public.conversations enable row level security;
create policy "members read their conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_member(id));

alter table public.conversation_members enable row level security;
create policy "members read the member list"
  on public.conversation_members for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

alter table public.messages enable row level security;

create policy "members read messages"
  on public.messages for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

create policy "members send messages as themselves"
  on public.messages for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and public.is_conversation_member(conversation_id)
  );

create policy "senders edit their own messages"
  on public.messages for update
  to authenticated
  using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);

-- Realtime for the chat thread (§8.2).
alter publication supabase_realtime add table public.messages;

-- =============================================================================
-- 3. start_conversation(listing) — find or create the buyer<->seller thread.
-- =============================================================================
create or replace function public.start_conversation(in_listing uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  seller uuid;
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select l.seller_id into seller from public.listings l where l.id = in_listing;
  if seller is null then raise exception 'listing not found'; end if;
  if seller = me then raise exception 'cannot message yourself'; end if;

  -- an existing buyer<->seller conversation for this listing?
  select c.id into conv
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = me
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = seller
  where c.listing_id = in_listing
  limit 1;

  if conv is not null then return conv; end if;

  insert into public.conversations (listing_id) values (in_listing) returning id into conv;
  insert into public.conversation_members (conversation_id, user_id)
    values (conv, me), (conv, seller);
  return conv;
end;
$$;

grant execute on function public.start_conversation(uuid) to authenticated;

-- =============================================================================
-- 4. Offer transitions (§8.4/§8.5). accept_offer is ATOMIC: it accepts the
--    offer, invalidates the other pending offers, and reserves the listing.
-- =============================================================================
create or replace function public.accept_offer(in_offer uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  o public.offers;
  recipient uuid;
begin
  select * into o from public.offers where id = in_offer for update;
  if o.id is null then raise exception 'offer not found'; end if;
  if o.status <> 'pending' then raise exception 'offer is not pending'; end if;

  -- the recipient is whoever did NOT propose this offer.
  recipient := case when o.proposed_by = o.buyer_id then o.seller_id else o.buyer_id end;
  if me <> recipient then raise exception 'not authorized' using errcode = '42501'; end if;

  update public.offers set status = 'accepted' where id = in_offer;
  update public.offers set status = 'declined'
    where listing_id = o.listing_id and id <> in_offer and status = 'pending';
  update public.listings set status = 'reserved' where id = o.listing_id;
end;
$$;

create or replace function public.decline_offer(in_offer uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  o public.offers;
  recipient uuid;
begin
  select * into o from public.offers where id = in_offer for update;
  if o.id is null then raise exception 'offer not found'; end if;
  if o.status <> 'pending' then raise exception 'offer is not pending'; end if;
  recipient := case when o.proposed_by = o.buyer_id then o.seller_id else o.buyer_id end;
  if me <> recipient then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.offers set status = 'declined' where id = in_offer;
end;
$$;

create or replace function public.withdraw_offer(in_offer uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  o public.offers;
begin
  select * into o from public.offers where id = in_offer for update;
  if o.id is null then raise exception 'offer not found'; end if;
  if o.status <> 'pending' then raise exception 'offer is not pending'; end if;
  if me <> o.proposed_by then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.offers set status = 'withdrawn' where id = in_offer;
end;
$$;

create or replace function public.counter_offer(in_offer uuid, new_amount integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  o public.offers;
  recipient uuid;
  new_id uuid;
begin
  if new_amount is null or new_amount <= 0 then raise exception 'invalid amount'; end if;
  select * into o from public.offers where id = in_offer for update;
  if o.id is null then raise exception 'offer not found'; end if;
  if o.status <> 'pending' then raise exception 'offer is not pending'; end if;
  recipient := case when o.proposed_by = o.buyer_id then o.seller_id else o.buyer_id end;
  if me <> recipient then raise exception 'not authorized' using errcode = '42501'; end if;

  update public.offers set status = 'declined' where id = in_offer;
  insert into public.offers (listing_id, buyer_id, seller_id, proposed_by, parent_offer_id, amount)
  values (o.listing_id, o.buyer_id, o.seller_id, me, in_offer, new_amount)
  returning id into new_id;
  return new_id;
end;
$$;

grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.decline_offer(uuid) to authenticated;
grant execute on function public.withdraw_offer(uuid) to authenticated;
grant execute on function public.counter_offer(uuid, integer) to authenticated;
