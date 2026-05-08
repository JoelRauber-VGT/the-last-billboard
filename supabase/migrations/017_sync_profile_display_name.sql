-- Single source of truth for the bidder's display name is profiles.display_name.
-- When a user updates their profile name we cascade it down to every slot they
-- still own so the canvas / tooltip / modals reflect the change immediately,
-- without every read site having to join through profiles. Anonymous slots
-- have their identity gated by `is_anonymous` in UI, so updating their stored
-- display_name is harmless (and consistent).
-- ----------------------------------------------------------------------------

create or replace function public.sync_slots_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'UPDATE' and OLD.display_name is distinct from NEW.display_name) then
    update public.slots
       set display_name = coalesce(NEW.display_name, '')
     where current_owner_id = NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_sync_slots_display_name on public.profiles;
create trigger profiles_sync_slots_display_name
  after update on public.profiles
  for each row execute function public.sync_slots_display_name();
