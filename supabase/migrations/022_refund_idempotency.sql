-- Refund idempotency hardening
--
-- Two changes prevent double Stripe refunds when the worker retries or an
-- admin double-clicks the "remove with refund" action:
--
--  1. `stripe_refund_id`: stable, unique reference to the refund object Stripe
--     returned. Once set, the worker can detect that this transaction row has
--     already been refunded and must skip it. Combined with the per-row
--     `idempotency_key = 'refund_<transaction.id>'` we send to Stripe, this
--     deduplicates retries even if our DB write fails between the Stripe call
--     and the status update.
--
--  2. Partial unique index on (user_id, slot_id) for pending refunds:
--     enforces at the database level that a slot can only have one open
--     refund per user. Double inserts (admin double-click, race between two
--     admins) raise a unique violation that the route handler maps to a 409.
--
-- Note: existing rows are left as-is. We're only blocking *new* duplicates;
-- any historic duplicates from before this migration would need a manual
-- cleanup before the partial unique index can be created — the index below
-- will fail loudly in that case, which is the correct behaviour.

alter table public.transactions
  add column if not exists stripe_refund_id text;

create unique index if not exists transactions_stripe_refund_id_idx
  on public.transactions (stripe_refund_id)
  where stripe_refund_id is not null;

-- Block a second pending refund row for the same (user, slot). Bid rows are
-- excluded via the type filter so normal bidding flow is unaffected.
create unique index if not exists transactions_one_pending_refund_per_user_slot
  on public.transactions (user_id, slot_id)
  where status = 'pending' and type = 'refund';
