import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getStripe } from '@/lib/stripe/server';
import Stripe from 'stripe';

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

      // Check idempotency - ensure we don't process the same event twice
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('stripe_session_id', session.id)
        .single();

      if (existingTransaction && existingTransaction.status === 'completed') {
        console.log(`Session ${session.id} already processed, skipping`);
        return NextResponse.json({ received: true });
      }

      // Extract metadata
      const metadata = session.metadata as Record<string, string>;
      const transactionId = metadata?.transaction_id;

      if (!transactionId) {
        console.error('Missing transaction_id in session metadata');
        return NextResponse.json(
          { error: 'Missing transaction_id in metadata' },
          { status: 400 }
        );
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

      console.log('Metadata:', metadata);

      // Process the bid atomically using Postgres function
      const { data: bidResult, error: bidError } = await supabase.rpc('process_bid', {
        p_transaction_id: transactionId,
        p_user_id: metadata.user_id,
        p_mode: metadata.mode,
        p_slot_id: metadata.slot_id || null,
        p_bid_eur: parseFloat(metadata.bid_eur),
        p_image_url: metadata.image_url || null,
        p_link_url: metadata.link_url,
        p_display_name: metadata.display_name,
        p_brand_color: metadata.brand_color,
        p_layout_width: parseInt(metadata.layout_width || '1', 10),
        p_layout_height: parseInt(metadata.layout_height || '1', 10),
        p_pan_x: parseFloat(metadata.pan_x || '0.5'),
        p_pan_y: parseFloat(metadata.pan_y || '0.5'),
        p_zoom: parseFloat(metadata.zoom || '1.0')
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
