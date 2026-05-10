-- Bug #6 (Operational-Risk): Last-Admin-Race-Condition in
-- /api/admin/users/toggle-admin.
--
-- Problem: Die Route las admins.length, prüfte "wenn 1 Admin und target wird
-- demoted -> reject", und feuerte danach UPDATE profiles SET is_admin=false.
-- Zwei parallele Demote-Requests (unterschiedliche Admins, unterschiedliche
-- Targets) konnten beide count=2 sehen, beide den Check passieren und beide
-- demoten -> 0 Admins.
--
-- Fix: atomare SQL-Function safe_set_admin, die alle Admin-Rows mit
-- FOR UPDATE lockt und so parallele Demote-Calls bis zum Commit blockiert.
-- Innerhalb des Locks wird gezählt; Demote des letzten Admins schlägt mit
-- RAISE EXCEPTION 'last_admin' fehl.
-- ---------------------------------------------------------------------------

create or replace function public.safe_set_admin(
  p_target_user_id uuid,
  p_make_admin boolean
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_target_is_admin boolean;
  v_admin_count integer;
begin
  if p_target_user_id is null then
    raise exception 'invalid_target' using errcode = '22023';
  end if;

  if p_make_admin then
    -- Promote: kein Constraint nötig, einfacher UPDATE.
    update public.profiles
       set is_admin = true
     where id = p_target_user_id;

    if not found then
      raise exception 'target_not_found' using errcode = 'P0002';
    end if;

    return jsonb_build_object('success', true, 'is_admin', true);
  end if;

  -- Demote: alle Admin-Rows locken, damit parallele Demotes serialisiert
  -- werden. Der Lock hält bis zum Commit/Rollback der aufrufenden
  -- Transaktion.
  perform 1
    from public.profiles
   where is_admin = true
   for update;

  select is_admin
    into v_target_is_admin
    from public.profiles
   where id = p_target_user_id
   for update;

  if not found then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;

  if v_target_is_admin then
    select count(*)
      into v_admin_count
      from public.profiles
     where is_admin = true;

    if v_admin_count <= 1 then
      raise exception 'last_admin' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles
     set is_admin = false
   where id = p_target_user_id;

  return jsonb_build_object('success', true, 'is_admin', false);
end;
$$;

revoke all on function public.safe_set_admin(uuid, boolean) from public;
grant execute on function public.safe_set_admin(uuid, boolean) to authenticated, service_role;

comment on function public.safe_set_admin(uuid, boolean) is
  'Atomar Admin-Status togglen. Lockt alle Admin-Rows FOR UPDATE und verhindert so Race-Conditions, die den letzten Admin demoten könnten. Wirft RAISE EXCEPTION ''last_admin'', wenn der letzte Admin demoted werden würde. Aufrufer muss eigene Authorization (Admin-Check) durchführen.';
