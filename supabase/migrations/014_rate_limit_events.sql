-- Generic rate-limit event log used by API routes that don't have a natural
-- domain table to count against (e.g. checkout/create-session, ensure-admin).
-- The helper at src/lib/rate-limit/checkRateLimit.ts inserts one row per
-- attempt and counts rows in a sliding window via the SECURITY DEFINER
-- function below; RLS keeps the table opaque to clients.
-- ----------------------------------------------------------------------------

create table if not exists public.rate_limit_events (
  id bigserial primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_key_created_at_idx
  on public.rate_limit_events (key, created_at desc);

alter table public.rate_limit_events enable row level security;

-- No client-readable / writable policies — the helper uses a SECURITY DEFINER
-- function that runs with table owner privileges.

-- Atomic check-and-record: counts events for `p_key` within the last
-- `p_window_seconds`, inserts a new event if under `p_limit`, and returns
-- whether the caller is allowed. Doing this in a single SQL function avoids
-- TOCTOU races between the count and insert from a Node handler.
create or replace function public.check_and_record_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean as $$
declare
  v_count integer;
begin
  -- Best-effort GC: prune events older than 24h on each call to keep the
  -- table bounded. Cheap because of the (key, created_at) index.
  delete from public.rate_limit_events
   where created_at < now() - interval '24 hours';

  select count(*) into v_count
    from public.rate_limit_events
   where key = p_key
     and created_at >= now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_events (key) values (p_key);
  return true;
end;
$$ language plpgsql security definer;

revoke all on function public.check_and_record_rate_limit(text, integer, integer) from public;
grant execute on function public.check_and_record_rate_limit(text, integer, integer) to authenticated, anon, service_role;
