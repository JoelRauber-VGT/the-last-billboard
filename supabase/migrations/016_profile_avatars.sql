-- Profile avatars: add avatar_url column + dedicated `avatars` storage bucket.
-- Each user uploads to a folder named after their auth UID, so RLS can scope
-- writes via path prefix while keeping reads public (avatars are visible to
-- anyone who can see the user's public profile).
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists avatar_url text;

-- Re-create the public-safe view to include avatar_url so the canvas / tooltip
-- can render avatars without exposing email or admin flags. We drop+recreate
-- because `create or replace view` cannot reorder/insert columns.
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, display_name, avatar_url, created_at
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- Storage bucket -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'avatars',
    'avatars',
    true,
    5 * 1024 * 1024,            -- 5 MB
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read for avatars.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Authenticated users can upload only into their own folder: <auth.uid()>/...
drop policy if exists "avatars_user_upload" on storage.objects;
create policy "avatars_user_upload"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_update" on storage.objects;
create policy "avatars_user_update"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_delete" on storage.objects;
create policy "avatars_user_delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
