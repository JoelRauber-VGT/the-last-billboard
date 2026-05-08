-- DSGVO: profiles.email darf nicht öffentlich lesbar sein.
-- Bisheriger Zustand (001_initial_schema.sql:81): profiles_select_all → using (true).
-- Damit konnten anon-Clients alle Profile inkl. E-Mail lesen.
--
-- Neue Regel:
--   * Self-Read: ein eingeloggter Nutzer sieht seine eigene Zeile (inkl. Email).
--   * Admin-Read: Admins sehen alle Zeilen.
--   * Anon / authenticated cross-user reads: müssen über die `public_profiles`
--     VIEW oder die `get_public_profile(uuid)` RPC laufen (beide ohne Email).
-- ----------------------------------------------------------------------------

drop policy if exists "profiles_select_all" on public.profiles;

create policy "profiles_select_self"
  on public.profiles
  for select
  using (id = auth.uid());

-- Recursive lookup is safe here: the inner select is also restricted by
-- profiles_select_self (id = auth.uid()), which matches the admin's own
-- row and returns its is_admin flag.
create policy "profiles_select_admin"
  on public.profiles
  for select
  using (
    exists (
      select 1
        from public.profiles p
       where p.id = auth.uid()
         and p.is_admin = true
    )
  );

-- Re-grant the public-safe VIEW (already created in 011, but make idempotent).
grant select on public.public_profiles to anon, authenticated;
