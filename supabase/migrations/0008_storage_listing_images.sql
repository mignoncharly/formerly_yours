-- 0008_storage_listing_images.sql
-- Phase 3 — private Storage bucket for listing photos (§3.4).
-- Path convention: {seller_id}/{listing_id}/{image_id}.webp
-- Bucket is PRIVATE: the public never gets a permanent URL; the app serves
-- images via short-lived signed URLs generated server-side (service role).
-- Clients may only write objects under their own {seller_id}/ prefix.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  false,
  10485760,                          -- 10 MB per object
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase. Scope writes to the
-- uploader's own top-level folder (= their auth uid).
create policy "sellers upload own listing images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "sellers update own listing images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "sellers delete own listing images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Sellers can read back their own objects (e.g. draft preview). Public display
-- uses server-generated signed URLs, so no anon read policy is needed.
create policy "sellers read own listing images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
