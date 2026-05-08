import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getStripe } from '@/lib/stripe/server';
import { isBillboardFrozenAsync } from '@/lib/freeze/getFreezeDate';
import Stripe from 'stripe';
import { z } from 'zod';

// Stripe metadata values arrive as strings. We coerce and validate
// with Zod so malformed values (NaN, out-of-range zoom) never reach
// the process_bid RPC.
const webhookMetadataSchema = z
  .object({
    transaction_id: z.string().uuid(),
    user_id: z.string().uuid(),
    mode: z.enum(['new', 'outbid']),
    slot_id: z
      .string()
      .optional()
      .transform((v) => (!v ? null : v))
      .pipe(z.string().uuid().nullable()),
    bid_eur: z.coerce.number().positive(),
    image_url: z
      .string()
      .optional()
      .transform((v) => (!v ? null : v)),
    link_url: z.string().url(),
    display_name: z.string().min(1).max(50),
    brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    pan_x: z.coerce.number().min(0).max(1).default(0.5),
    pan_y: z.coerce.number().min(0).max(1).default(0.5),
    zoom: z.coerce.number().min(1.0).max(3.0).default(1.0),
  })
  .refine((d) => d.mode !== 'outbid' || d.slot_id !== null, {
    path: ['slot_id'],
    message: 'slot_id is required for outbid mode',
  });

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Get the signature from headers
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  // Get the raw body
  const body = await request.text();

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 400 }
    );
  }

  // Log webhook event
  console.log(`[${new Date().toISOString()}] Received webhook event: ${event.type}`, {
    id: event.id,
    type: event.type,
  });

  // Create Supabase client with service role for webhook operations
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

  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log(`Processing checkout.session.completed for session: ${session.id}`);

      // Check idempotency - ensure we don't process the same event twice.
      // Skip on any non-pending status: 'completed' means process_bid already
      // ran and committed atomically; 'refunded' means a race-condition refund
      // was issued. Only 'pending' means we still need to run process_bid.
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('stripe_session_id', session.id)
        .single();

      if (existingTransaction && existingTransaction.status !== 'pending') {
        console.log(
          `Session ${session.id} already processed (status: ${existingTransaction.status}), skipping`
        );
        return NextResponse.json({ received: true });
      }

      // Validate metadata with Zod before any DB mutation. Malformed
      // values (e.g. non-numeric zoom, negative layout dims, missing
      // fields) are rejected before they reach process_bid.
      const rawMetadata = (session.metadata ?? {}) as Record<string, string>;
      const parsed = webhookMetadataSchema.safeParse(rawMetadata);

      if (!parsed.success) {
        console.error(
          'Invalid session metadata:',
          parsed.error.issues,
          'raw:',
          rawMetadata
        );
        return NextResponse.json(
          { error: 'Invalid session metadata', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const metadata = parsed.data;
      const transactionId = metadata.transaction_id;

      // Freeze gate: if the admin moved the freeze date earlier while
      // this Stripe session was in flight, the payment landed *after*
      // the billboard closed. Don't run process_bid — instead mark the
      // transaction failed and queue a refund. We still record the
      // payment_intent so the refund processor can issue the refund.
      if (await isBillboardFrozenAsync()) {
        console.warn(
          `[freeze-gate] Webhook arrived after freeze for transaction ${transactionId}; queuing refund`
        );

        await supabase
          .from('transactions')
          .update({
            stripe_payment_intent_id: session.payment_intent as string,
            status: 'failed',
          })
          .eq('id', transactionId);

        // Queue a pending refund row for the existing refund processor.
        await supabase.from('transactions').insert({
          user_id: metadata.user_id,
          slot_id: null,
          amount_eur: metadata.bid_eur,
          commission_eur: 0,
          type: 'refund',
          status: 'pending',
          stripe_payment_intent_id: session.payment_intent as string,
        });

        const { processRefunds } = await import('@/lib/stripe/processRefunds');
        await processRefunds();
        return NextResponse.json({ received: true, refunded: true });
      }

      // Update transaction with payment intent ID (status will be updated by process_bid)
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('Failed to update transaction with payment intent:', updateError);
        return NextResponse.json(
          { error: 'Failed to update transaction' },
          { status: 500 }
        );
      }

      // Process the bid atomically using Postgres function
      const { data: bidResult, error: bidError } = await supabase.rpc('process_bid', {
        p_transaction_id: transactionId,
        p_user_id: metadata.user_id,
        p_mode: metadata.mode,
        p_slot_id: metadata.slot_id,
        p_bid_eur: metadata.bid_eur,
        p_image_url: metadata.image_url,
        p_link_url: metadata.link_url,
        p_display_name: metadata.display_name,
        p_brand_color: metadata.brand_color,
        // layout_width/height are legacy schema fields; the renderer uses
        // the live treemap, not these. Keep at 1×1 to satisfy the RPC's
        // positive-int constraint without implying a fixed pixel block.
        p_layout_width: 1,
        p_layout_height: 1,
        p_pan_x: metadata.pan_x,
        p_pan_y: metadata.pan_y,
        p_zoom: metadata.zoom,
      });

      if (bidError) {
        console.error('Failed to process bid:', bidError);
        return NextResponse.json(
          { error: 'Failed to process bid' },
          { status: 500 }
        );
      }

      console.log(`Bid processed successfully:`, bidResult);

      // Check if race condition occurred
      if (bidResult && !bidResult.success) {
        console.warn(`Race condition detected for transaction ${transactionId}:`, bidResult.message);
        // Refund will be processed by the refund processing utility
      }

      // Process any pending refunds
      // Import and call processRefunds function
      const { processRefunds } = await import('@/lib/stripe/processRefunds');
      const refundResults = await processRefunds();
      console.log(`Refund processing results:`, refundResults);

      console.log(`Transaction ${transactionId} marked as completed`);
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;

      console.log(`Processing charge.refunded for charge: ${charge.id}`);

      // Find transaction by payment_intent_id
      const { data: transaction, error: findError } = await supabase
        .from('transactions')
        .select('id')
        .eq('stripe_payment_intent_id', charge.payment_intent as string)
        .single();

      if (findError || !transaction) {
        console.error('Transaction not found for refunded charge:', charge.id);
        // Don't fail the webhook for this
        return NextResponse.json({ received: true });
      }

      // Update transaction status to refunded
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'refunded',
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('Failed to update transaction to refunded:', updateError);
        return NextResponse.json(
          { error: 'Failed to update transaction' },
          { status: 500 }
        );
      }

      console.log(`Transaction ${transaction.id} marked as refunded`);
      console.log(`Refund amount: ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`);
      break;
    }

    default: {
      console.log(`Unhandled event type: ${event.type}`);
    }
  }

  // Return 200 to acknowledge receipt of the event
  return NextResponse.json({ received: true });
}
