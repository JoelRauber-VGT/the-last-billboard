-- Update process_bid function to include new layout fields

create or replace function public.process_bid(
  p_transaction_id uuid,
  p_user_id uuid,
  p_mode text, -- 'new' or 'outbid'
  p_slot_id uuid, -- null for new, required for outbid
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
  p_commission_rate numeric DEFAULT 0.10
) returns json as $$
declare
  v_slot_id uuid;
  v_old_owner_id uuid;
  v_old_bid_eur numeric;
  v_refund_amount numeric;
  v_commission_eur numeric;
  v_result json;
begin
  -- Step 1: Mark transaction as completed
  update public.transactions
  set status = 'completed', updated_at = now()
  where id = p_transaction_id;

  -- Step 2: Handle based on mode
  if p_mode = 'new' then
    -- Create new slot
    insert into public.slots (
      current_owner_id,
      current_bid_eur,
      image_url,
      link_url,
      display_name,
      brand_color,
      layout_width,
      layout_height,
      pan_x,
      pan_y,
      zoom,
      status
    ) values (
      p_user_id,
      p_bid_eur,
      p_image_url,
      p_link_url,
      p_display_name,
      p_brand_color,
      p_layout_width,
      p_layout_height,
      p_pan_x,
      p_pan_y,
      p_zoom,
      'active'
    ) returning id into v_slot_id;

    -- Create initial history entry
    insert into public.slot_history (
      slot_id,
      owner_id,
      display_name,
      bid_eur,
      image_url,
      link_url,
      started_at
    ) values (
      v_slot_id,
      p_user_id,
      p_display_name,
      p_bid_eur,
      p_image_url,
      p_link_url,
      now()
    );

    v_result := json_build_object(
      'success', true,
      'mode', 'new',
      'slot_id', v_slot_id
    );

  elsif p_mode = 'outbid' then
    -- Lock the slot row to prevent race conditions
    select current_owner_id, current_bid_eur
    into v_old_owner_id, v_old_bid_eur
    from public.slots
    where id = p_slot_id
    for update;

    -- Race condition check: Is new bid still higher?
    if p_bid_eur <= v_old_bid_eur then
      -- Someone else outbid in the meantime
      -- Mark transaction for full refund (platform error, not user's fault)
      insert into public.transactions (
        user_id,
        slot_id,
        type,
        amount_eur,
        commission_eur,
        status
      ) values (
        p_user_id,
        p_slot_id,
        'refund',
        p_bid_eur,
        0, -- No commission taken on refund due to race condition
        'pending'
      );

      v_result := json_build_object(
        'success', false,
        'reason', 'race_condition',
        'message', 'This slot was outbid by someone else while you were bidding'
      );

      return v_result;
    end if;

    -- Close previous history entry
    update public.slot_history
    set ended_at = now(), displaced_by_id = p_user_id
    where slot_id = p_slot_id and ended_at is null;

    -- Calculate refund for old owner (90% of their bid)
    if v_old_owner_id is not null then
      v_commission_eur := v_old_bid_eur * p_commission_rate;
      v_refund_amount := v_old_bid_eur - v_commission_eur;

      insert into public.transactions (
        user_id,
        slot_id,
        type,
        amount_eur,
        commission_eur,
        status
      ) values (
        v_old_owner_id,
        p_slot_id,
        'refund',
        v_refund_amount,
        v_commission_eur, -- Commission amount that is NOT refunded
        'pending'
      );
    end if;

    -- Update slot with new owner and layout
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
      updated_at = now()
    where id = p_slot_id;

    -- Create new history entry
    insert into public.slot_history (
      slot_id,
      owner_id,
      display_name,
      bid_eur,
      image_url,
      link_url,
      started_at
    ) values (
      p_slot_id,
      p_user_id,
      p_display_name,
      p_bid_eur,
      p_image_url,
      p_link_url,
      now()
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
