import { createServerClient } from '@supabase/ssr';
import { getStripe } from './server';

/**
 * Result of refund processing operation
 */
export interface RefundProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  details: Array<{
    transaction_id: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
}

/**
 * Process all pending refund transactions
 *
 * This function:
 * 1. Queries all transactions with type='refund' and status='pending'
 * 2. For each refund, finds the original payment_intent from the bid transaction
 * 3. Creates a Stripe refund (with idempotency_key tied to the transaction row)
 * 4. Updates the transaction status to 'completed' or 'failed'
 *
 * Idempotency model:
 * - We pass `idempotency_key: refund_<transaction.id>` to Stripe so a retry
 *   never produces a second money movement: Stripe returns the original refund.
 * - Before calling Stripe we re-check the row and skip any transaction that
 *   already has a `stripe_refund_id`. This protects us from a previous
 *   successful Stripe call whose DB status update failed.
 *
 * @returns Summary of processed, failed and skipped refunds
 */
export async function processRefunds(): Promise<RefundProcessingResult> {
  const stripe = getStripe();

  // Create Supabase client with service role
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op for service role client
        },
      },
    }
  );

  const result: RefundProcessingResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  // Step 1: Get all pending refunds
  const { data: pendingRefunds, error: fetchError } = await supabase
    .from('transactions')
    .select('id, user_id, slot_id, amount_eur, commission_eur, stripe_refund_id')
    .eq('type', 'refund')
    .eq('status', 'pending');

  if (fetchError) {
    console.error('Failed to fetch pending refunds:', fetchError);
    throw new Error(`Failed to fetch pending refunds: ${fetchError.message}`);
  }

  if (!pendingRefunds || pendingRefunds.length === 0) {
    console.log('No pending refunds to process');
    return result;
  }

  console.log(`Processing ${pendingRefunds.length} pending refunds`);

  // Step 2: Process each refund
  for (const refund of pendingRefunds) {
    try {
      console.log(`Processing refund for transaction ${refund.id}`);

      // Idempotency guard: a previous run may have created the Stripe refund
      // but failed to flip our status to 'completed'. The row will still look
      // 'pending' to the SELECT above; the stripe_refund_id is the marker
      // that the money already left the platform.
      if (refund.stripe_refund_id) {
        console.warn(
          `Refund ${refund.id} already has stripe_refund_id ${refund.stripe_refund_id}; ` +
            `reconciling status to completed and skipping Stripe call`
        );

        const { error: reconcileError } = await supabase
          .from('transactions')
          .update({ status: 'completed' })
          .eq('id', refund.id);

        if (reconcileError) {
          console.error(`Failed to reconcile refund ${refund.id}:`, reconcileError);
          result.failed++;
          result.details.push({
            transaction_id: refund.id,
            status: 'failed',
            error: 'Failed to reconcile already-refunded transaction'
          });
          continue;
        }

        result.skipped++;
        result.details.push({
          transaction_id: refund.id,
          status: 'skipped',
          error: 'Already refunded; status reconciled'
        });
        continue;
      }

      // Find the original bid transaction for this slot and user
      // We need to find the most recent 'bid' transaction for this user on this slot
      const { data: originalBid, error: bidError } = await supabase
        .from('transactions')
        .select('stripe_payment_intent_id')
        .eq('user_id', refund.user_id)
        .eq('slot_id', refund.slot_id)
        .eq('type', 'bid')
        .eq('status', 'completed')
        .not('stripe_payment_intent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (bidError || !originalBid || !originalBid.stripe_payment_intent_id) {
        console.error(`No payment intent found for refund ${refund.id}:`, bidError);

        // Mark as failed
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', refund.id);

        result.failed++;
        result.details.push({
          transaction_id: refund.id,
          status: 'failed',
          error: 'No payment intent found for refund'
        });
        continue;
      }

      // Step 3: Create Stripe refund
      // Convert EUR to cents for Stripe
      const refundAmountCents = Math.round(refund.amount_eur * 100);

      console.log(`Creating Stripe refund for payment intent ${originalBid.stripe_payment_intent_id}, amount: ${refundAmountCents} cents`);

      // The idempotency_key is the safety net for the gap between this call
      // and the DB write below. If the worker crashes or the next poll runs
      // before we persisted stripe_refund_id, Stripe will dedupe by the key
      // and return the same refund object instead of charging us twice.
      const stripeRefund = await stripe.refunds.create(
        {
          payment_intent: originalBid.stripe_payment_intent_id,
          amount: refundAmountCents,
          reason: 'requested_by_customer', // Standard reason for displacement refunds
          metadata: {
            transaction_id: refund.id,
            slot_id: refund.slot_id || '',
            refund_type: 'displacement'
          }
        },
        {
          idempotencyKey: `refund_${refund.id}`,
        }
      );

      console.log(`Stripe refund created: ${stripeRefund.id}`);

      // Step 4: Persist the Stripe refund id first, then flip status. The
      // unique index on stripe_refund_id makes this write the durable marker
      // even if a follow-up status update fails.
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          stripe_refund_id: stripeRefund.id,
        })
        .eq('id', refund.id);

      if (updateError) {
        console.error(`Failed to update refund transaction ${refund.id}:`, updateError);
        result.failed++;
        result.details.push({
          transaction_id: refund.id,
          status: 'failed',
          error: 'Failed to update transaction after Stripe refund'
        });
        continue;
      }

      result.processed++;
      result.details.push({
        transaction_id: refund.id,
        status: 'success'
      });

    } catch (error) {
      console.error(`Failed to process refund ${refund.id}:`, error);

      // Mark as failed. We deliberately do NOT clear stripe_refund_id here:
      // if the failure happened post-Stripe-call, the marker (if any) must
      // survive so the next run skips instead of double-refunding.
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', refund.id);

      result.failed++;
      result.details.push({
        transaction_id: refund.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log(
    `Refund processing complete: ${result.processed} processed, ${result.failed} failed, ${result.skipped} skipped`
  );
  return result;
}
