import { createServerClient } from '@supabase/ssr';
import { getStripe } from './server';

/**
 * Result of refund processing operation
 */
export interface RefundProcessingResult {
  processed: number;
  failed: number;
  details: Array<{
    transaction_id: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

/**
 * Process all pending refund transactions
 *
 * This function:
 * 1. Queries all transactions with type='refund' and status='pending'
 * 2. For each refund, finds the original payment_intent from the bid transaction
 * 3. Creates a Stripe refund
 * 4. Updates the transaction status to 'completed' or 'failed'
 *
 * @returns Summary of processed and failed refunds
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
    details: []
  };

  // Step 1: Get all pending refunds
  const { data: pendingRefunds, error: fetchError } = await supabase
    .from('transactions')
    .select('id, user_id, slot_id, amount_eur, commission_eur')
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

      const stripeRefund = await stripe.refunds.create({
        payment_intent: originalBid.stripe_payment_intent_id,
        amount: refundAmountCents,
        reason: 'requested_by_customer', // Standard reason for displacement refunds
        metadata: {
          transaction_id: refund.id,
          slot_id: refund.slot_id || '',
          refund_type: 'displacement'
        }
      });

      console.log(`Stripe refund created: ${stripeRefund.id}`);

      // Step 4: Update transaction status to completed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          stripe_payment_intent_id: stripeRefund.id // Store refund ID for reference
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

      // Mark as failed
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

  console.log(`Refund processing complete: ${result.processed} processed, ${result.failed} failed`);
  return result;
}
