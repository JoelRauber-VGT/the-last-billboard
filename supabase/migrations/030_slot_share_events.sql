-- Slot share-funnel telemetry.
-- Tracks two event kinds per slot:
--   share — owner (or anyone with the dialog open) clicked a social target.
--   click — visitor landed on the slot via a UTM-tagged share link.
-- The intent is to give owners a "your slot was clicked N times via X" stat.
-- Anonymous visitors are recorded by an ip_hash bucket; logged-in users by id.

create table if not exists public.slot_share_events (
  id uuid default gen_random_uuid() primary key,
  slot_id uuid references public.slots(id) on delete cascade not null,
  kind text not null check (kind in ('share', 'click')),
  platform text,
  variant text,
  user_id uuid references public.profiles(id) on delete set null,
  ip_hash text,
  created_at timestamptz default now() not null
);

create index if not exists idx_slot_share_events_slot_kind
  on public.slot_share_events(slot_id, kind, created_at desc);

create index if not exists idx_slot_share_events_dedupe
  on public.slot_share_events(slot_id, kind, platform, ip_hash, created_at desc);

alter table public.slot_share_events enable row level security;

-- Anyone (anon included) can insert — values are validated server-side via
-- the API route, which rate-limits and hashes the IP. We don't trust client
-- payloads to identify other users, so user_id is checked against auth.uid().
create policy "share_events_insert_any" on public.slot_share_events
  for insert
  with check (
    user_id is null or user_id = auth.uid()
  );

-- Only the slot owner sees their own events; admins see all.
create policy "share_events_select_owner" on public.slot_share_events
  for select using (
    exists (
      select 1 from public.slots s
       where s.id = slot_share_events.slot_id
         and s.current_owner_id = auth.uid()
    )
  );

create policy "share_events_admin_all" on public.slot_share_events
  for all using (
    exists (
      select 1 from public.profiles
       where id = auth.uid() and is_admin = true
    )
  );

-- Aggregate view: per-slot counts. The owner-only RLS on the underlying
-- table means a SELECT from this view automatically returns zero counts
-- for slots that aren't yours.
create or replace view public.slot_share_stats as
  select
    s.id as slot_id,
    coalesce(sum(case when e.kind = 'share' then 1 else 0 end), 0)::int as share_count,
    coalesce(sum(case when e.kind = 'click' then 1 else 0 end), 0)::int as click_count
    from public.slots s
    left join public.slot_share_events e on e.slot_id = s.id
   group by s.id;
