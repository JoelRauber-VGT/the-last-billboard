-- Outbid notifications.
-- When slot_history.displaced_by_id transitions from null to a uuid (i.e. a
-- previous owner gets displaced by a new bid via process_bid), emit an inbox
-- notification to the displaced owner so they see it on the bell icon.
--
-- The new row in `slots` has the displacing user's display_name + bid_eur, so
-- the trigger pulls them from there to keep the payload self-contained.

-- 1. Allow new notification type ----------------------------------------------
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'reveal_request_received',
      'reveal_request_accepted',
      'reveal_request_declined',
      'slot_outbid',
      'system'
    )
  );

-- 2. Trigger: emit slot_outbid on displacement --------------------------------
create or replace function public.handle_slot_outbid_notification()
returns trigger as $$
declare
  v_new_owner uuid;
  v_new_bid numeric;
  v_new_name text;
  v_new_is_anon boolean;
begin
  -- Only fire when displaced_by_id was just set (transition null → uuid).
  if (new.displaced_by_id is null) then
    return new;
  end if;
  if (old.displaced_by_id is not null) then
    return new;
  end if;
  -- Don't notify if there was no previous owner (edge: ghost row) or if
  -- the displaced user is the same as the displacer (shouldn't happen).
  if (new.owner_id is null) then
    return new;
  end if;
  if (new.owner_id = new.displaced_by_id) then
    return new;
  end if;

  select s.current_owner_id, s.current_bid_eur, s.display_name, s.is_anonymous
    into v_new_owner, v_new_bid, v_new_name, v_new_is_anon
    from public.slots s
   where s.id = new.slot_id;

  insert into public.notifications (user_id, type, payload)
  values (
    new.owner_id,
    'slot_outbid',
    jsonb_build_object(
      'slot_id', new.slot_id,
      'previous_bid_eur', new.bid_eur,
      'new_owner_id', v_new_owner,
      'new_bid_eur', v_new_bid,
      -- Hide the new owner's name if they bid anonymously.
      'new_owner_name', case when v_new_is_anon then null else v_new_name end,
      'new_is_anonymous', coalesce(v_new_is_anon, false)
    )
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_slot_outbid_notification on public.slot_history;
create trigger trg_slot_outbid_notification
  after update on public.slot_history
  for each row execute procedure public.handle_slot_outbid_notification();
