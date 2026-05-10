-- Webhook event replay protection (Bug #2 — money loss via Stripe retry race).
-- ----------------------------------------------------------------------------
-- Stripe retries webhook deliveries on any non-2xx response or delivery
-- timeout. The previous idempotency guard only checked
-- `transactions.status != 'pending'`, which two concurrent retries can both
-- observe as 'pending' before either commits process_bid. The result was
-- duplicate slot mints and duplicate outbid refunds — actual money loss.
--
-- This migration adds two layers of defense:
--
--  1. `webhook_events` — a primary-key table keyed on `event.id`. The webhook
--     handler INSERTs ON CONFLICT DO NOTHING as the very first DB op after
--     signature verification. A duplicate Stripe event_id collides on the PK,
--     the handler returns 200, and Stripe stops retrying.
--
--  2. Partial unique index on `transactions(stripe_session_id)` — defense in
--     depth in case Stripe ever delivers two distinct event_ids that both
--     reference the same checkout session.
-- ----------------------------------------------------------------------------

create table if not exists public.webhook_events (
  event_id    text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

-- Cleanup helper: Stripe's retry window is ~3 days, but we keep ~30 days of
-- events for debugging. The index supports a TTL purge job if/when added.
create index if not exists webhook_events_received_at_idx
  on public.webhook_events (received_at);

-- Service-role only access. We deliberately add no policies; with RLS enabled
-- and no policies, only the service_role (which bypasses RLS) can read/write.
alter table public.webhook_events enable row level security;

-- Defense in depth: a Stripe checkout session can only ever be tied to one
-- transaction row. Existing rows without stripe_session_id (refunds, etc.)
-- are excluded by the partial predicate.
create unique index if not exists transactions_stripe_session_id_idx
  on public.transactions (stripe_session_id)
  where stripe_session_id is not null;
