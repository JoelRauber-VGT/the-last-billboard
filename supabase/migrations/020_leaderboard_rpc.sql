-- Public leaderboard data. Returns three buckets:
--   1. users           — non-anonymous bidders, ranked by spend
--   2. anonymous_pool  — aggregated totals for all anonymous bids (no identity)
--   3. stats           — global metrics for the live stats bar
--
-- "Spent" follows the same gross-bid convention as get_public_profile (active
-- slot bids + historic ended bids). Refunds aren't deducted on purpose:
-- gross "money put on the line" drives competition harder than net.
-- ----------------------------------------------------------------------------

create or replace function public.get_leaderboard()
returns json as $$
declare
  v_users jsonb;
  v_anon jsonb;
  v_stats jsonb;
begin
  with user_slots as (
    select
      s.current_owner_id as user_id,
      sum(s.current_bid_eur) as active_spent,
      count(*) as active_count,
      max(s.current_bid_eur) as max_active_bid
    from public.slots s
    where s.is_anonymous = false
      and s.status != 'removed'
      and s.current_owner_id is not null
    group by s.current_owner_id
  ),
  user_history as (
    select
      h.owner_id as user_id,
      sum(h.bid_eur) as historic_spent,
      count(*) as historic_count,
      max(h.bid_eur) as max_historic_bid
    from public.slot_history h
    where h.is_anonymous = false
      and h.ended_at is not null
      and h.owner_id is not null
    group by h.owner_id
  ),
  combined as (
    select
      p.id,
      p.display_name,
      p.avatar_url,
      p.created_at as joined_at,
      coalesce(us.active_spent, 0) + coalesce(uh.historic_spent, 0) as total_spent,
      coalesce(us.active_count, 0) + coalesce(uh.historic_count, 0) as slots_won,
      coalesce(us.active_count, 0) as currently_holding,
      greatest(coalesce(us.max_active_bid, 0), coalesce(uh.max_historic_bid, 0)) as highest_bid
    from public.profiles p
    left join user_slots us on us.user_id = p.id
    left join user_history uh on uh.user_id = p.id
    where coalesce(us.active_spent, 0) + coalesce(uh.historic_spent, 0) > 0
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'display_name', display_name,
        'avatar_url', avatar_url,
        'joined_at', joined_at,
        'total_spent', total_spent,
        'slots_won', slots_won,
        'currently_holding', currently_holding,
        'highest_bid', highest_bid
      )
      order by total_spent desc, slots_won desc, joined_at asc
    ),
    '[]'::jsonb
  )
  into v_users
  from combined;

  select jsonb_build_object(
    'total_spent',
      coalesce((
        select sum(current_bid_eur) from public.slots
         where is_anonymous = true and status != 'removed'
      ), 0)
      + coalesce((
        select sum(bid_eur) from public.slot_history
         where is_anonymous = true and ended_at is not null
      ), 0),
    'slots_won',
      coalesce((
        select count(*) from public.slots
         where is_anonymous = true and status != 'removed'
      ), 0)
      + coalesce((
        select count(*) from public.slot_history
         where is_anonymous = true and ended_at is not null
      ), 0),
    'currently_holding',
      coalesce((
        select count(*) from public.slots
         where is_anonymous = true and status != 'removed'
      ), 0),
    'highest_bid',
      greatest(
        coalesce((
          select max(current_bid_eur) from public.slots
           where is_anonymous = true and status != 'removed'
        ), 0),
        coalesce((
          select max(bid_eur) from public.slot_history
           where is_anonymous = true and ended_at is not null
        ), 0)
      )
  )
  into v_anon;

  select jsonb_build_object(
    'total_volume',
      coalesce((
        select sum(current_bid_eur) from public.slots
         where status != 'removed'
      ), 0)
      + coalesce((
        select sum(bid_eur) from public.slot_history
         where ended_at is not null
      ), 0),
    'total_bidders',
      coalesce((
        select count(distinct user_id) from public.transactions
         where type = 'bid' and status = 'completed' and user_id is not null
      ), 0),
    'active_bidders_24h',
      coalesce((
        select count(distinct user_id) from public.transactions
         where type = 'bid' and status = 'completed'
           and created_at > now() - interval '24 hours'
           and user_id is not null
      ), 0),
    'active_slots',
      coalesce((
        select count(*) from public.slots where status = 'active'
      ), 0),
    'highest_bid_ever',
      greatest(
        coalesce((
          select max(current_bid_eur) from public.slots where status != 'removed'
        ), 0),
        coalesce((
          select max(bid_eur) from public.slot_history where ended_at is not null
        ), 0)
      )
  )
  into v_stats;

  return jsonb_build_object(
    'users', v_users,
    'anonymous_pool', v_anon,
    'stats', v_stats
  );
end;
$$ language plpgsql security definer stable;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated;
