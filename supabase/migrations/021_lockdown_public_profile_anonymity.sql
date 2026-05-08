-- Vorherige Version (Migration 019) hat total_won + total_spent_eur inkl.
-- anonymer Käufe gerechnet ("Anonymous purchases are included so the displayed
-- totals match reality"). Das ist eine Anonymitäts-Leakage: Wenn jemand 3
-- öffentliche und 2 anonyme Slots hat, sieht ein Besucher seines Profils ein
-- total_won=5 und kann durch Differenz zu den sichtbaren Slots auf anonyme
-- Aktivität rückschließen. Genauso bei total_spent_eur.
--
-- Diese Migration sperrt das öffentliche Profil komplett gegen anonyme Daten:
--   * total_won / total_spent_eur zählen ausschließlich is_anonymous = false
--   * anonymous_active_count / anonymous_lost_count werden weiter zurückgegeben,
--     aber immer als 0 — so bleiben bestehende Aufrufer typkompatibel, ohne
--     dass die Felder noch Information leaken.
-- ----------------------------------------------------------------------------

create or replace function public.get_public_profile(p_profile_id uuid)
returns json as $$
declare
  v_profile record;
  v_active jsonb;
  v_history jsonb;
  v_total_won integer;
  v_total_spent_eur numeric;
begin
  select id, display_name, avatar_url, created_at
    into v_profile
    from public.profiles
   where id = p_profile_id;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id,
           'display_name', s.display_name,
           'image_url', s.image_url,
           'link_url', s.link_url,
           'current_bid_eur', s.current_bid_eur,
           'status', s.status,
           'created_at', s.created_at
         ) order by s.current_bid_eur desc), '[]'::jsonb)
    into v_active
    from public.slots s
   where s.current_owner_id = p_profile_id
     and s.is_anonymous = false
     and s.status != 'removed';

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', h.id,
           'slot_id', h.slot_id,
           'display_name', h.display_name,
           'image_url', h.image_url,
           'bid_eur', h.bid_eur,
           'started_at', h.started_at,
           'ended_at', h.ended_at
         ) order by h.ended_at desc nulls first), '[]'::jsonb)
    into v_history
    from public.slot_history h
   where h.owner_id = p_profile_id
     and h.is_anonymous = false
     and h.ended_at is not null
   limit 50;

  -- Aggregate stats: NUR non-anonyme Aktivität, sonst leaken Differenzen.
  select
      coalesce((
        select count(*)
          from public.slots
         where current_owner_id = p_profile_id
           and is_anonymous = false
           and status != 'removed'
      ), 0)
    + coalesce((
        select count(*)
          from public.slot_history
         where owner_id = p_profile_id
           and is_anonymous = false
           and ended_at is not null
      ), 0)
    into v_total_won;

  select
      coalesce((
        select sum(current_bid_eur)
          from public.slots
         where current_owner_id = p_profile_id
           and is_anonymous = false
           and status != 'removed'
      ), 0)
    + coalesce((
        select sum(bid_eur)
          from public.slot_history
         where owner_id = p_profile_id
           and is_anonymous = false
           and ended_at is not null
      ), 0)
    into v_total_spent_eur;

  return jsonb_build_object(
    'id', v_profile.id,
    'display_name', v_profile.display_name,
    'avatar_url', v_profile.avatar_url,
    'created_at', v_profile.created_at,
    'active_slots', v_active,
    'history', v_history,
    'anonymous_active_count', 0,
    'anonymous_lost_count', 0,
    'total_won', v_total_won,
    'total_spent_eur', v_total_spent_eur
  );
end;
$$ language plpgsql security definer stable;

grant execute on function public.get_public_profile(uuid) to anon, authenticated;
