-- Harden slot-images storage uploads.
-- ----------------------------------------------------------------------------
-- The original policy from 001_initial_schema.sql allowed any authenticated
-- user to upload arbitrary files of arbitrary size to the slot-images bucket.
-- Client-side validation in src/lib/upload/uploadSlotImage.ts can be bypassed
-- by hitting the Supabase REST API directly with the anon key. This migration
-- enforces server-side limits that match the client validation:
--   - MIME type: image/png, image/jpeg, image/webp only
--   - Size: <= 10 MB (matches config.maxImageSizeMb)
--   - Path: filename must start with the uploader's auth.uid() — matches the
--     existing filename convention `${userId}_${timestamp}_${sanitizedName}`
--     and prevents one user from clobbering or impersonating another's path.
-- ----------------------------------------------------------------------------

-- Replace the permissive insert policy
drop policy if exists "slot_images_authenticated_upload" on storage.objects;

create policy "slot_images_authenticated_upload" on storage.objects
  for insert
  with check (
    bucket_id = 'slot-images'
    and auth.uid() is not null
    and (metadata ->> 'mimetype') in ('image/png', 'image/jpeg', 'image/webp')
    and ((metadata ->> 'size')::bigint) <= 10485760
    and name like (auth.uid()::text || '\_%') escape '\'
  );

-- Restrict update/delete to the original uploader as well so a user cannot
-- overwrite or remove someone else's image once uploaded.
drop policy if exists "slot_images_authenticated_update" on storage.objects;
create policy "slot_images_authenticated_update" on storage.objects
  for update
  using (
    bucket_id = 'slot-images'
    and auth.uid() is not null
    and name like (auth.uid()::text || '\_%') escape '\'
  )
  with check (
    bucket_id = 'slot-images'
    and (metadata ->> 'mimetype') in ('image/png', 'image/jpeg', 'image/webp')
    and ((metadata ->> 'size')::bigint) <= 10485760
    and name like (auth.uid()::text || '\_%') escape '\'
  );

drop policy if exists "slot_images_authenticated_delete" on storage.objects;
create policy "slot_images_authenticated_delete" on storage.objects
  for delete
  using (
    bucket_id = 'slot-images'
    and auth.uid() is not null
    and name like (auth.uid()::text || '\_%') escape '\'
  );
