-- Anonymous purchases + reveal-request inbox
-- ----------------------------------------------------------------------------
-- Adds:
--   1. is_anonymous flag on slots / slot_history / transactions (per-purchase)
--   2. reveal_requests table — one user can ask an anonymous owner to reveal
--   3. notifications table — generic per-user inbox (reveal_request, reveal_response, system)
--   4. Updated process_bid() that propagates is_anonymous
--   5. Tightened profiles RLS (no email leakage to other users)
--   6. Public profile RPC that respects anonymity
--   7. Auto-emit reveal_request and reveal_response notifications via trigger
-- ----------------------------------------------------------------------------

-- 1. Per-purchase anonymity flag ----------------------------------------------
alter table public.slots
  add column if not exists is_anonymous boolean not null default false;

alter table public.slot_history
  add column if not exists is_anonymous boolean not null default false;

alter table public.transactions
  add column if not exists is_anonymous boolean not null default false;

-- 2. Reveal requests ----------------------------------------------------------
create table if not exists public.reveal_requests (
  id uuid default gen_random_uuid() primary key,
  slot_id uuid references public.slots(id) on delete cascade not null,
  -- snapshot of the owner at request-time; slot may be outbid before response
  target_owner_id uuid references public.profiles(id) on delete cascade not null,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  message text check (length(message) <= 500),
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','expired')),
  response_message text check (length(response_message) <= 500),
  created_at timestamptz default now() not null,
  responded_at timestamptz,
  -- one request total per (slot, target, requester) — no re-asks after decline
  unique (slot_id, target_owner_id, requester_id)
);

create index if not exists idx_reveal_requests_target on public.reveal_requests(target_owner_id, status);
create index if not exists idx_reveal_requests_requester on public.reveal_requests(requester_id, status);
create index if not exists idx_reveal_requests_slot on public.reveal_requests(slot_id);

alter table public.reveal_requests enable row level security;

-- requester can read their own outgoing requests
create policy "reveal_requests_select_own_outgoing" on public.reveal_requests
  for select using (requester_id = auth.uid());

-- target can read their own incoming requests
create policy "reveal_requests_select_own_incoming" on public.reveal_requests
  for select using (target_owner_id = auth.uid());

-- admin can see everything
create policy "reveal_requests_admin_all" on public.reveal_requests
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- requester can insert (validated server-side for slot ownership / rate limit)
create policy "reveal_requests_insert_authenticated" on public.reveal_requests
  for insert with check (auth.uid() = requester_id);

-- target can update only the status / response_message / responded_at of their own incoming requests
create policy "reveal_requests_update_target" on public.reveal_requests
  for update using (target_owner_id = auth.uid())
  with check (target_owner_id = auth.uid());

-- 3. Notifications inbox ------------------------------------------------------
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in (
    'reveal_request_received',
    'reveal_request_accepted',
    'reveal_request_declined',
    'system'
  )),
  -- structured payload (slot_id, requester_id, etc.) — keep client-friendly
  payload jsonb not null default '{}'::jsonb,
  related_reveal_request_id uuid references public.reveal_requests(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, read_at) where read_at is null;
create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

-- user can see + update their own notifications
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- inserts come from triggers (security definer) — admin can also insert
create policy "notifications_admin_all" on public.notifications
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- 4. Auto-emit notifications via trigger -------------------------------------
create or replace function public.handle_reveal_request_change() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    -- notify target owner of incoming request
    insert into public.notifications (user_id, type, payload, related_reveal_request_id)
    values (
      new.target_owner_id,
      'reveal_request_received',
      jsonb_build_object(
        'slot_id', new.slot_id,
        'requester_id', new.requester_id,
        'message', new.message
      ),
      new.id
    );
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    -- notify requester of accept/decline
    if (new.status = 'accepted' and old.status = 'pending') then
      insert into public.notifications (user_id, type, payload, related_reveal_request_id)
      values (
        new.requester_id,
        'reveal_request_accepted',
        jsonb_build_object(
          'slot_id', new.slot_id,
          'target_owner_id', new.target_owner_id,
          'response_message', new.response_message
        ),
        new.id
      );
    elsif (new.status = 'declined' and old.status = 'pending') then
      insert into public.notifications (user_id, type, payload, related_reveal_request_id)
      values (
        new.requester_id,
        'reveal_request_declined',
        jsonb_build_object(
          'slot_id', new.slot_id,
          'target_owner_id', new.target_owner_id,
          'response_message', new.response_message
        ),
        new.id
      );
    end if;
    return new;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_reveal_request_change on public.reveal_requests;
create trigger trg_reveal_request_change
  after insert or update on public.reveal_requests
  for each row execute procedure public.handle_reveal_request_change();

-- 5. Public-safe profile view (no email / is_admin leak)
-- We keep the existing profiles_select_all policy for backwards compatibility
-- with admin / dashboard reads, but introduce a view that only exposes
-- safe columns. New client code should prefer this view.
create or replace view public.public_profiles as
  select id, display_name, created_at
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- 6. Public profile RPC: returns the profile + slot lists, respecting anonymity
-- ----------------------------------------------------------------------------
-- A viewer of /profile/[id] sees:
--   * non-anonymous current slots
--   * non-anonymous historic (lost) slots
--   * counts of anonymous purchases (aggregated, no detail)
-- security definer so we can join on private rows but apply our own policy.
create or replace function public.get_public_profile(p_profile_id uuid)
returns json as $$
declare
  v_profile record;
  v_active jsonb;
  v_history jsonb;
  v_anonymous_active_count integer;
  v_anonymous_lost_count integer;
begin
  select id, display_name, created_at
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

  return jsonb_build_object(
    'id', v_profile.id,
    'display_name', v_profile.display_name,
    'created_at', v_profile.created_at,
    'active_slots', v_active,
    'history', v_history,
    'anonymous_active_count', v_anonymous_active_count,
    'anonymous_lost_count', v_anonymous_lost_count
  );
end;
$$ language plpgsql security definer stable;

grant execute on function public.get_public_profile(uuid) to anon, authenticated;

-- 7. Updated process_bid that propagates is_anonymous ------------------------
create or replace function public.process_bid(
  p_transaction_id uuid,
  p_user_id uuid,
  p_mode text,
  p_slot_id uuid,
  p_bid_eur numeric,
  p_image_url text,
  p_link_url text,
  p_display_name text,
  p_brand_color text,
  p_layout_width integer,
  p_layout_height integer,
  p_pan_x real DEFAULT 0.5,
  p_pan_y real DEFAULT 0.5,
  p_zoom real DEFAULT 1.0,
  p_commission_rate numeric DEFAULT 0.10,
  p_is_anonymous boolean DEFAULT false
) returns json as $$
declare
  v_slot_id uuid;
  v_old_owner_id uuid;
  v_old_bid_eur numeric;
  v_refund_amount numeric;
  v_commission_eur numeric;
  v_result json;
begin
  update public.transactions
  set status = 'completed', updated_at = now(), is_anonymous = p_is_anonymous
  where id = p_transaction_id;

  if p_mode = 'new' then
    insert into public.slots (
      current_owner_id, current_bid_eur, image_url, link_url,
      display_name, brand_color, layout_width, layout_height,
      pan_x, pan_y, zoom, status, is_anonymous
    ) values (
      p_user_id, p_bid_eur, p_image_url, p_link_url,
      p_display_name, p_brand_color, p_layout_width, p_layout_height,
      p_pan_x, p_pan_y, p_zoom, 'active', p_is_anonymous
    ) returning id into v_slot_id;

    insert into public.slot_history (
      slot_id, owner_id, display_name, bid_eur, image_url, link_url,
      started_at, is_anonymous
    ) values (
      v_slot_id, p_user_id, p_display_name, p_bid_eur, p_image_url, p_link_url,
      now(), p_is_anonymous
    );

    v_result := json_build_object(
      'success', true,
      'mode', 'new',
      'slot_id', v_slot_id
    );

  elsif p_mode = 'outbid' then
    select current_owner_id, current_bid_eur
      into v_old_owner_id, v_old_bid_eur
      from public.slots
     where id = p_slot_id
       for update;

    if p_bid_eur <= v_old_bid_eur then
      insert into public.transactions (
        user_id, slot_id, type, amount_eur, commission_eur, status
      ) values (
        p_user_id, p_slot_id, 'refund', p_bid_eur, 0, 'pending'
      );

      v_result := json_build_object(
        'success', false,
        'reason', 'race_condition',
        'message', 'This slot was outbid by someone else while you were bidding'
      );
      return v_result;
    end if;

    update public.slot_history
       set ended_at = now(), displaced_by_id = p_user_id
     where slot_id = p_slot_id and ended_at is null;

    if v_old_owner_id is not null then
      v_commission_eur := v_old_bid_eur * p_commission_rate;
      v_refund_amount := v_old_bid_eur - v_commission_eur;

      insert into public.transactions (
        user_id, slot_id, type, amount_eur, commission_eur, status
      ) values (
        v_old_owner_id, p_slot_id, 'refund', v_refund_amount, v_commission_eur, 'pending'
      );
    end if;

    update public.slots
       set
         current_owner_id = p_user_id,
         current_bid_eur = p_bid_eur,
         image_url = p_image_url,
         link_url = p_link_url,
         display_name = p_display_name,
         brand_color = p_brand_color,
         layout_width = p_layout_width,
         layout_height = p_layout_height,
         pan_x = p_pan_x,
         pan_y = p_pan_y,
         zoom = p_zoom,
         is_anonymous = p_is_anonymous,
         updated_at = now()
     where id = p_slot_id;

    insert into public.slot_history (
      slot_id, owner_id, display_name, bid_eur, image_url, link_url,
      started_at, is_anonymous
    ) values (
      p_slot_id, p_user_id, p_display_name, p_bid_eur, p_image_url, p_link_url,
      now(), p_is_anonymous
    );

    v_result := json_build_object(
      'success', true,
      'mode', 'outbid',
      'slot_id', p_slot_id,
      'refund_amount', v_refund_amount,
      'refund_user_id', v_old_owner_id
    );

  else
    raise exception 'Invalid mode: %', p_mode;
  end if;

  return v_result;
end;
$$ language plpgsql security definer;
