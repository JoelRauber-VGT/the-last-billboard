-- Admin Alerts Table
-- Tracks important events that require admin attention

create table public.admin_alerts (
  id uuid default gen_random_uuid() primary key,
  type text not null, -- 'refund_failed', 'race_condition', 'payment_error', etc.
  message text not null,
  metadata jsonb,
  status text default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz default now() not null,
  resolved_at timestamptz,
  resolved_by_id uuid references public.profiles(id) on delete set null
);

-- Indexes
create index idx_admin_alerts_status on public.admin_alerts(status);
create index idx_admin_alerts_type on public.admin_alerts(type);
create index idx_admin_alerts_created_at on public.admin_alerts(created_at desc);

-- RLS
alter table public.admin_alerts enable row level security;

-- Policy: Only admins can view and manage alerts
create policy "admin_alerts_admin_only" on public.admin_alerts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Helper function to create admin alerts
create or replace function public.create_admin_alert(
  p_type text,
  p_message text,
  p_metadata jsonb default null
) returns uuid as $$
declare
  v_alert_id uuid;
begin
  insert into public.admin_alerts (type, message, metadata)
  values (p_type, p_message, p_metadata)
  returning id into v_alert_id;

  return v_alert_id;
end;
$$ language plpgsql security definer;
