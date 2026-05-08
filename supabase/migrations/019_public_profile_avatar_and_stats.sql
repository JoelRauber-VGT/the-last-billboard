-- Erweitere get_public_profile, sodass die /profile/[id]-Seite das Avatar-Bild
-- und ein paar Aggregatstatistiken (gewonnene Slots gesamt, total ausgegebene
-- EUR) rendern kann. avatar_url existiert seit Migration 016 auf
-- public.profiles, fehlte aber im RPC-Output. Die Stats zählen anonyme und
-- nicht-anonyme Käufe gemeinsam, weil sie keine konkreten Slots offenlegen.
-- ----------------------------------------------------------------------------

create or replace function public.get_public_profile(p_profile_id uuid)
returns json as $$
declare
  v_profile record;
  v_active jsonb;
  v_history jsonb;
  v_anonymous_active_count integer;
  v_anonymous_lost_count integer;
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

  -- non-anonymous current slots owned by this profile
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

  -- non-anonymous historic (lost) slots
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

  select count(*) into v_anonymous_active_count
    from public.slots
   where current_owner_id = p_profile_id
     and is_anonymous = true
     and status != 'removed';

  select count(*) into v_anonymous_lost_count
    from public.slot_history
   where owner_id = p_profile_id
     and is_anonymous = true
     and ended_at is not null;

  -- Aggregate stats: total slots ever held + total EUR put down on bids.
  -- Active slots count once (current bid), historic rows count their ended bid.
  -- Anonymous purchases are included so the displayed totals match reality.
  select
      coalesce((
        select count(*)
          from public.slots
         where current_owner_id = p_profile_id
           and status != 'removed'
      ), 0)
    + coalesce((
        select count(*)
          from public.slot_history
         where owner_id = p_profile_id
           and ended_at is not null
      ), 0)
    into v_total_won;

  select
      coalesce((
        select sum(current_bid_eur)
          from public.slots
         where current_owner_id = p_profile_id
           and status != 'removed'
      ), 0)
    + coalesce((
        select sum(bid_eur)
          from public.slot_history
         where owner_id = p_profile_id
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
    'anonymous_active_count', v_anonymous_active_count,
    'anonymous_lost_count', v_anonymous_lost_count,
    'total_won', v_total_won,
    'total_spent_eur', v_total_spent_eur
  );
end;
$$ language plpgsql security definer stable;

grant execute on function public.get_public_profile(uuid) to anon, authenticated;
