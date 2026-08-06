-- 0004_profile_intent.sql
-- Phase 2 — onboarding (§2.3). Persist "What brings you here?" (Sell/Browse/Both)
-- so the app can tailor the experience and we can measure intent at signup.

create type public.profile_intent as enum ('sell', 'browse', 'both');

-- Nullable: set by the onboarding wizard's first step. Existing rows stay null.
alter table public.profiles
  add column signup_intent public.profile_intent;
