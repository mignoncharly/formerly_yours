-- 0002_enums.sql
-- Foundational enums (schema blueprint §3). Phase-agnostic and referenced by the
-- tables introduced in later phases (listings in Phase 3, stories in Phase 4, ...).

create type public.listing_status as enum (
  'draft',
  'pending_review',
  'active',
  'reserved',
  'sold',
  'paused',
  'rejected',
  'removed'
);

create type public.item_condition as enum (
  'new',
  'like_new',
  'very_good',
  'good',
  'fair'
);

create type public.story_mode as enum (
  'clean_break',
  'little_tea',
  'full_story'
);

create type public.identity_visibility as enum (
  'public',
  'limited',
  'anonymous'
);

create type public.moderation_status as enum (
  'pending',
  'approved',
  'needs_changes',
  'rejected',
  'removed'
);

create type public.order_status as enum (
  'pending_payment',
  'paid',
  'awaiting_shipping',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'disputed',
  'refunded'
);

create type public.offer_status as enum (
  'pending',
  'accepted',
  'declined',
  'withdrawn',
  'expired'
);

create type public.chapter_status as enum (
  'active',
  'completed',
  'paused',
  'archived'
);

create type public.report_status as enum (
  'open',
  'reviewing',
  'resolved',
  'dismissed'
);

create type public.reaction_type as enum (
  'dead',
  'red_flag',
  'tea',
  'good_for_you',
  'sending_love',
  'savage'
);
