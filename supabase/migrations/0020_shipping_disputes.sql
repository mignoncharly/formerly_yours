-- 0020_shipping_disputes.sql
-- Phase 10 — Shipping + Disputes (implementation plan §10). Provider-agnostic
-- shipments, an order lifecycle state machine, and buyer disputes. Sensitive
-- transitions go through SECURITY DEFINER functions with explicit authz.

-- =============================================================================
-- 1. Enums (§10.3/§10.4).
-- =============================================================================
create type public.shipment_status as enum (
  'label_created',
  'dropped_off',
  'in_transit',
  'delivered',
  'exception',
  'lost',
  'returned'
);

create type public.dispute_reason as enum (
  'item_never_arrived',
  'different_item',
  'major_damage',
  'counterfeit',
  'other'
);

-- =============================================================================
-- 2. shipments + shipping_events (§10.2/§10.3). Provider-agnostic.
-- =============================================================================
create table public.shipments (
  id              uuid primary key default extensions.gen_random_uuid(),
  order_id        uuid not null unique references public.orders (id) on delete cascade,
  provider        text not null default 'mock',
  tracking_number text,
  label_url       text,
  status          public.shipment_status not null default 'label_created',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function extensions.moddatetime (updated_at);

create table public.shipping_events (
  id          uuid primary key default extensions.gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  status      public.shipment_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index shipping_events_shipment_idx on public.shipping_events (shipment_id, created_at);

-- =============================================================================
-- 3. disputes (§10.4). Order parties + staff can see; evidence upload is later.
-- =============================================================================
create table public.disputes (
  id            uuid primary key default extensions.gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  opener_id     uuid not null references public.profiles (id) on delete cascade,
  reason        public.dispute_reason not null,
  details       text,
  evidence_path text,
  status        public.report_status not null default 'open',
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index disputes_order_idx on public.disputes (order_id);

-- =============================================================================
-- 4. RLS — order parties (and staff) read; all writes via the functions below.
-- =============================================================================
create or replace function public.is_order_party(in_order uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o
    where o.id = in_order and (select auth.uid()) in (o.buyer_id, o.seller_id)
  );
$$;
grant execute on function public.is_order_party(uuid) to authenticated;

alter table public.shipments enable row level security;
create policy "order parties read shipments"
  on public.shipments for select to authenticated
  using (public.is_order_party(order_id));

alter table public.shipping_events enable row level security;
create policy "order parties read shipping events"
  on public.shipping_events for select to authenticated
  using (exists (select 1 from public.shipments s where s.id = shipment_id and public.is_order_party(s.order_id)));

alter table public.disputes enable row level security;
create policy "order parties and staff read disputes"
  on public.disputes for select to authenticated
  using (public.is_order_party(order_id) or public.is_staff());

-- =============================================================================
-- 5. Order lifecycle state machine (§9.4/§10). Authenticated callers; each fn
--    checks the actor. paid → shipped → delivered → completed; buyer may dispute.
-- =============================================================================
create or replace function public.mark_shipped(in_order uuid, in_tracking text, in_provider text default 'mock')
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); o public.orders; sid uuid;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into o from public.orders where id = in_order for update;
  if o.id is null then raise exception 'order not found'; end if;
  if me <> o.seller_id then raise exception 'only the seller can ship' using errcode = '42501'; end if;
  if o.status not in ('paid', 'awaiting_shipping') then raise exception 'order not ready to ship'; end if;

  insert into public.shipments (order_id, provider, tracking_number, status)
  values (in_order, in_provider, in_tracking, 'label_created')
  on conflict (order_id) do update set tracking_number = excluded.tracking_number, provider = excluded.provider
  returning id into sid;
  insert into public.shipping_events (shipment_id, status, note) values (sid, 'label_created', 'label created');
  update public.orders set status = 'shipped' where id = in_order;
end; $$;

create or replace function public.mark_delivered(in_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); o public.orders;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into o from public.orders where id = in_order for update;
  if o.id is null then raise exception 'order not found'; end if;
  if me not in (o.buyer_id, o.seller_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if o.status <> 'shipped' then raise exception 'order is not in transit'; end if;

  update public.shipments set status = 'delivered' where order_id = in_order;
  insert into public.shipping_events (shipment_id, status, note)
    select id, 'delivered', 'marked delivered' from public.shipments where order_id = in_order;
  update public.orders set status = 'delivered' where id = in_order;
end; $$;

create or replace function public.complete_order(in_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); o public.orders; seller_net integer;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into o from public.orders where id = in_order for update;
  if o.id is null then raise exception 'order not found'; end if;
  if me <> o.buyer_id then raise exception 'only the buyer can confirm receipt' using errcode = '42501'; end if;
  if o.status <> 'delivered' then raise exception 'order is not delivered'; end if;

  update public.orders set status = 'completed' where id = in_order;
  -- funds already moved via the destination charge; record the payout marker.
  seller_net := o.subtotal_amount - o.seller_fee_amount;
  insert into private.ledger_entries (order_id, entry_type, amount, currency)
    values (in_order, 'payout', seller_net, o.currency);
end; $$;

create or replace function public.open_dispute(in_order uuid, in_reason public.dispute_reason, in_details text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); o public.orders; did uuid;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into o from public.orders where id = in_order for update;
  if o.id is null then raise exception 'order not found'; end if;
  if me <> o.buyer_id then raise exception 'only the buyer can open a dispute' using errcode = '42501'; end if;
  if o.status not in ('paid', 'shipped', 'delivered') then raise exception 'cannot dispute this order'; end if;

  insert into public.disputes (order_id, opener_id, reason, details)
    values (in_order, me, in_reason, in_details) returning id into did;
  update public.orders set status = 'disputed' where id = in_order;
  return did;
end; $$;

revoke execute on function public.mark_shipped(uuid, text, text) from anon;
revoke execute on function public.mark_delivered(uuid) from anon;
revoke execute on function public.complete_order(uuid) from anon;
revoke execute on function public.open_dispute(uuid, public.dispute_reason, text) from anon;
grant execute on function public.mark_shipped(uuid, text, text) to authenticated;
grant execute on function public.mark_delivered(uuid) to authenticated;
grant execute on function public.complete_order(uuid) to authenticated;
grant execute on function public.open_dispute(uuid, public.dispute_reason, text) to authenticated;
