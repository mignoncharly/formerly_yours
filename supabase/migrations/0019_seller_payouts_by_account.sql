-- 0019_seller_payouts_by_account.sql
-- Phase 9 — let the Stripe `account.updated` webhook update a seller's payout
-- status by connected-account id (the webhook doesn't know our user id).
-- service_role only, like the other money functions.

create or replace function public.set_seller_payouts_by_account(
  in_account text,
  in_enabled boolean,
  in_kyc     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.seller_accounts
    set payouts_enabled = in_enabled, kyc_status = in_kyc, updated_at = now()
    where stripe_account_id = in_account;
end;
$$;

revoke execute on function public.set_seller_payouts_by_account(text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.set_seller_payouts_by_account(text, boolean, text)
  to service_role;
