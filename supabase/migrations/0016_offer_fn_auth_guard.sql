-- 0016_offer_fn_auth_guard.sql
-- Phase 8 fix: the offer SECURITY DEFINER functions compared auth.uid() without
-- a null-guard. For an anonymous caller auth.uid() is NULL, so `me <> recipient`
-- evaluates to NULL (not TRUE) and the authorization check did NOT fire — any
-- unauthenticated caller could accept/decline/withdraw/counter an offer.
-- Fix: explicit `if me is null then raise`, and revoke EXECUTE from anon
-- (functions default to EXECUTE for PUBLIC).

create or replace function public.accept_offer(in_offer uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  o public.offers;
  recipient uuid;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into o from public.offers where id = in_offer for update;
  if o.id is null then raise exception 'offer not found'; end if;
  if o.status <> 'pending' then raise exception 'offer is not pending'; end if;
  recipient := case when o.proposed_by = o.buyer_id then o.seller_id else o.buyer_id end;
  if me <> recipient then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.offers set status = 'accepted' where id = in_offer;
  update public.offers set status = 'declined'
    where listing_id = o.listing_id and id <> in_offer and status = 'pending';
  update public.listings set status = 'reserved' where id = o.listing_id;
end;
$$;

create or replace function public.decline_offer(in_offer uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  o public.offers;
  recipient uuid;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into o from public.offers where id = in_offer for update;
  if o.id is null then raise exception 'offer not found'; end if;
  if o.status <> 'pending' then raise exception 'offer is not pending'; end if;
  recipient := case when o.proposed_by = o.buyer_id then o.seller_id else o.buyer_id end;
  if me <> recipient then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.offers set status = 'declined' where id = in_offer;
end;
$$;

create or replace function public.withdraw_offer(in_offer uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  o public.offers;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into o from public.offers where id = in_offer for update;
  if o.id is null then raise exception 'offer not found'; end if;
  if o.status <> 'pending' then raise exception 'offer is not pending'; end if;
  if me <> o.proposed_by then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.offers set status = 'withdrawn' where id = in_offer;
end;
$$;

create or replace function public.counter_offer(in_offer uuid, new_amount integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  o public.offers;
  recipient uuid;
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
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

revoke execute on function public.accept_offer(uuid) from anon;
revoke execute on function public.decline_offer(uuid) from anon;
revoke execute on function public.withdraw_offer(uuid) from anon;
revoke execute on function public.counter_offer(uuid, integer) from anon;
revoke execute on function public.start_conversation(uuid) from anon;
