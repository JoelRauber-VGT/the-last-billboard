-- Users (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  is_admin boolean default false not null,
  created_at timestamptz default now() not null
);

-- Slots: Die aktuellen Blöcke auf dem Billboard
create table public.slots (
  id uuid default gen_random_uuid() primary key,
  current_owner_id uuid references public.profiles(id) on delete set null,
  current_bid_eur numeric(10,2) not null check (current_bid_eur >= 1),
  image_url text,
  link_url text not null,
  display_name text not null,
  brand_color text, -- Hex, z.B. '#FF6B00'
  status text not null default 'active' check (status in ('active', 'frozen', 'removed')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Slot-History: Jede Verdrängung wird protokolliert
create table public.slot_history (
  id uuid default gen_random_uuid() primary key,
  slot_id uuid references public.slots(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  bid_eur numeric(10,2) not null,
  image_url text,
  link_url text,
  started_at timestamptz not null,
  ended_at timestamptz, -- null = aktueller Besitzer
  displaced_by_id uuid references public.profiles(id) on delete set null
);

-- Transactions: Stripe-Zahlungen
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  slot_id uuid references public.slots(id) on delete set null,
  type text not null check (type in ('bid', 'refund')),
  amount_eur numeric(10,2) not null,
  commission_eur numeric(10,2) not null default 0,
  stripe_session_id text,
  stripe_payment_intent_id text,
  status text not null check (status in ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz default now() not null
);

-- Reports: User-Meldungen (post-hoc Moderation)
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  slot_id uuid references public.slots(id) on delete cascade not null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz default now() not null,
  resolved_at timestamptz,
  resolved_by_id uuid references public.profiles(id) on delete set null
);

-- Indexes
create index idx_slots_status on public.slots(status);
create index idx_slots_current_bid on public.slots(current_bid_eur desc);
create index idx_slot_history_slot_id on public.slot_history(slot_id);
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_status on public.transactions(status);
create index idx_reports_status on public.reports(status);

-- RLS
alter table public.profiles enable row level security;
alter table public.slots enable row level security;
alter table public.slot_history enable row level security;
alter table public.transactions enable row level security;
alter table public.reports enable row level security;

-- Policies
-- Profiles: alle können lesen, nur self kann updaten
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);

-- Slots: alle können lesen, nur Admin kann direkt modifizieren
create policy "slots_select_all" on public.slots for select using (true);
create policy "slots_admin_all" on public.slots for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Slot-History: alle können lesen
create policy "slot_history_select_all" on public.slot_history for select using (true);

-- Transactions: User sieht nur eigene, Admin sieht alle
create policy "transactions_select_own" on public.transactions for select using (
  user_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Reports: User kann reporten, Admin kann alles
create policy "reports_insert_authenticated" on public.reports for insert with check (auth.uid() is not null);
create policy "reports_select_own_or_admin" on public.reports for select using (
  reporter_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "reports_update_admin" on public.reports for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Trigger: Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage Bucket für Slot-Images
insert into storage.buckets (id, name, public) values ('slot-images', 'slot-images', true);

create policy "slot_images_public_read" on storage.objects for select using (bucket_id = 'slot-images');
create policy "slot_images_authenticated_upload" on storage.objects for insert with check (
  bucket_id = 'slot-images' and auth.uid() is not null
);
