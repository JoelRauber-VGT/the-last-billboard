-- process_bid idempotency hardening (Bug #2 — money loss via Stripe retry race).
-- ----------------------------------------------------------------------------
-- Final defense layer: even if Stripe delivers a duplicate event AND the
-- webhook_events PK guard somehow misses (e.g. cold cache, manual replay,
-- two-region race), process_bid itself must be a no-op on a transaction it
-- has already completed.
--
-- Two changes vs. the previous body (migration 012):
--
--   1. Early-return when the transaction is already 'completed'. Returns the
--      same shape as a successful run so the caller's success path is stable.
--
--   2. The transactions UPDATE that flips status pending -> completed is now
--      gated on `WHERE id = p_transaction_id AND status = 'pending'`. If 0
--      rows match, a concurrent caller already won the race; we return
--      immediately and skip ALL slot/history/refund mutations. This makes
--      double slot mints and double refund inserts impossible even under
--      perfect parallel execution of two webhook handlers.
--
-- Signature is unchanged from migration 012 (14 params), so the webhook RPC
-- call site does not need to change.
-- ----------------------------------------------------------------------------

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
  v_existing_status text;
  v_slot_id uuid;
  v_old_owner_id uuid;
  v_old_bid_eur numeric;
  v_refund_amount numeric;
  v_commission_eur numeric;
  v_rows_updated integer;
  v_result json;
begin
  -- Layer A: already-completed early return (idempotent on retry).
  select status into v_existing_status
    from public.transactions
   where id = p_transaction_id;

  if v_existing_status is null then
    raise exception 'process_bid: transaction % not found', p_transaction_id;
  end if;

  if v_existing_status = 'completed' then
    return json_build_object(
      'success', true,
      'mode', p_mode,
      'idempotent', true,
      'message', 'Transaction already completed; no-op'
    );
  end if;

  -- Layer B: gated UPDATE. Only one concurrent caller can flip
  -- pending -> completed; the loser sees v_rows_updated = 0 and bails out
  -- before doing any slot/history/refund mutations.
  update public.transactions
     set status = 'completed',
         updated_at = now(),
         is_anonymous = p_is_anonymous
   where id = p_transaction_id
     and status = 'pending';

  get diagnostics v_rows_updated = row_count;

  if v_rows_updated = 0 then
    -- A concurrent caller already won. Return idempotent success so the
    -- webhook returns 200 and Stripe stops retrying.
    return json_build_object(
      'success', true,
      'mode', p_mode,
      'idempotent', true,
      'message', 'Concurrent caller already completed this transaction'
    );
  end if;

  -- ---- From here on we are the unique owner of this transaction ----------

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
