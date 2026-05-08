-- Hotfix für Migration 015: profiles_select_admin verursacht infinite recursion.
--
-- Sobald irgend eine andere Policy (z.B. slots_admin_all) ein
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin)
-- evaluiert, läuft das durch die profiles-RLS — und dort feuert wieder
-- profiles_select_admin, das wieder ein EXISTS auf profiles macht. Postgres
-- bricht mit "infinite recursion detected in policy for relation profiles" ab,
-- und damit fallen sämtliche Slot-Reads auf null.
--
-- Lösung: den is_admin-Lookup in eine SECURITY DEFINER-Funktion auslagern.
-- Die Funktion liest profiles unter dem Owner der Funktion (postgres) — ohne
-- erneute RLS-Auswertung — und bricht so die Schleife.
-- ----------------------------------------------------------------------------

create or replace function public.is_current_user_admin()
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to anon, authenticated;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles
  for select
  using (public.is_current_user_admin());
