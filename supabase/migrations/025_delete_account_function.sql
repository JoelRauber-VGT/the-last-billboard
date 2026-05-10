-- Atomic self-service account deletion (Art. 17 DSGVO)
-- ----------------------------------------------------------------------------
-- Wraps the two anonymization updates that the TS handler used to perform
-- sequentially (src/app/api/account/delete/route.ts steps 1 + 2) into a single
-- Postgres transaction. If any step fails, Postgres rolls back the entire
-- function — no partial-anonymization state is possible.
--
-- Scope:
--   * UPDATE public.slots: strip PII, mark removed (currently-active slots).
--   * UPDATE public.slot_history: strip PII from historic ownership rows.
--
-- Out of scope (intentionally still in the TS handler, after this RPC succeeds):
--   * Storage deletion of the user's uploaded images.
--   * auth.admin.deleteUser() — must be called via Supabase Auth API.
--     Profiles / notifications / reveal_requests cascade-delete from auth.users.
--     transactions.user_id, reports.reporter_id, slot_history.owner_id,
--     slots.current_owner_id are FK SET NULL by schema.
-- ----------------------------------------------------------------------------

create or replace function public.delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c_anonymized_name constant text := '[deleted account]';
begin
  -- Hard guard: refuse to operate on a null id (would otherwise touch every row).
  if p_user_id is null then
    raise exception 'delete_account: p_user_id must not be null'
      using errcode = '22023';
  end if;

  -- 1. Strip PII from currently-active slots owned by this user, mark removed.
  update public.slots
     set display_name = c_anonymized_name,
         image_url    = null,
         link_url     = '',
         brand_color  = null,
         is_anonymous = true,
         status       = 'removed',
         updated_at   = now()
   where current_owner_id = p_user_id;

  -- 2. Anonymize historic ownership rows for this user.
  update public.slot_history
     set display_name = c_anonymized_name,
         image_url    = null,
         link_url     = null,
         is_anonymous = true
   where owner_id = p_user_id;
end;
$$;

-- Only the service role (used by the API route) may execute this.
revoke all on function public.delete_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_account(uuid) to service_role;
