-- Drop legacy layout_width / layout_height columns and prune them from process_bid.
-- ----------------------------------------------------------------------------
-- These columns were introduced in 007_layout_fields.sql as a per-slot pixel
-- footprint. The current renderer uses a logarithmic treemap (see
-- src/lib/billboard/treemap.ts) and computes block sizes from current_bid_eur
-- only — layout_width/height have not been read by application code since the
-- treemap renderer landed. The Stripe webhook was hardcoding them to 1×1 just
-- to satisfy the layout_positive CHECK constraint.
-- ----------------------------------------------------------------------------

-- 1. Drop the dependent constraint and columns
alter table public.slots drop constraint if exists layout_positive;

alter table public.slots
  drop column if exists layout_width,
  drop column if exists layout_height;

-- 2. Drop the old process_bid signature (the parameter list changes, so
--    CREATE OR REPLACE is not sufficient — Postgres treats the new signature
--    as a different overload).
drop function if exists public.process_bid(
  uuid, uuid, text, uuid, numeric, text, text, text, text,
  integer, integer, real, real, real, numeric, boolean
);

-- 3. Recreate process_bid without p_layout_width / p_layout_height
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
      display_name, brand_color,
      pan_x, pan_y, zoom, status, is_anonymous
    ) values (
      p_user_id, p_bid_eur, p_image_url, p_link_url,
      p_display_name, p_brand_color,
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
