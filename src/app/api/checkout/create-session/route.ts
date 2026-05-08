import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';
import { config } from '@/lib/config';
import { throwIfFrozenAsync } from '@/lib/freeze/getFreezeDate';
import { checkRateLimit } from '@/lib/rate-limit/checkRateLimit';

/**
 * Resolve the caller's locale so Stripe redirects land on the right
 * language. Route handlers don't inherit next-intl's request locale,
 * so we (1) accept an explicit `locale` in the body, (2) fall back
 * to parsing the Referer path, and (3) default to config.defaultLocale.
 */
function resolveLocale(request: NextRequest, bodyLocale: unknown): string {
  const allowed = config.locales as readonly string[];
  if (typeof bodyLocale === 'string' && allowed.includes(bodyLocale)) {
    return bodyLocale;
  }
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const path = new URL(referer).pathname;
      const segment = path.split('/').filter(Boolean)[0];
      if (segment && allowed.includes(segment)) {
        return segment;
      }
    } catch {
      // fallthrough
    }
  }
  return config.defaultLocale;
}

// Request body schema
interface CreateSessionRequest {
  mode: 'new' | 'outbid';
  slot_id?: string;
  bid_eur: number;
  image_url?: string;
  link_url: string;
  display_name: string;
  brand_color: string;
  locale?: string;
  is_anonymous?: boolean;
}

/**
 * POST /api/checkout/create-session
 * Create a Stripe Checkout Session for a bid
 */
export async function POST(request: NextRequest) {
  try {
    // Check if billboard is frozen
    try {
      await throwIfFrozenAsync();
    } catch (freezeError) {
      return NextResponse.json(
        { error: 'Billboard is frozen' },
        { status: 403 }
      );
    }

    // Get authenticated user
    const supabase = await createServerActionClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to bid' },
        { status: 401 }
      );
    }

    // Rate limit: cap session-creation churn per user. Each call provisions a
    // Stripe session and a pending transaction row, so unbounded calls would
    // burn Stripe API quota and bloat the transactions table.
    const rl = await checkRateLimit(supabase, `checkout:${user.id}`, 10, 300);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: rl.error ?? 'Too many checkout attempts. Please wait a few minutes and try again.' },
        { status: rl.error ? 500 : 429 }
      );
    }

    // Parse and validate request body
    const body: CreateSessionRequest = await request.json();
    const { mode, slot_id, bid_eur, image_url, link_url, display_name, brand_color } = body;
    const is_anonymous = body.is_anonymous === true;
    const locale = resolveLocale(request, body.locale);

    // Validation: mode
    if (!mode || !['new', 'outbid'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "new" or "outbid"' },
        { status: 400 }
      );
    }

    // Validation: slot_id required for outbid mode
    if (mode === 'outbid' && !slot_id) {
      return NextResponse.json(
        { error: 'slot_id is required for outbid mode' },
        { status: 400 }
      );
    }

    // Validation: bid_eur
    if (typeof bid_eur !== 'number' || bid_eur <= 0) {
      return NextResponse.json(
        { error: 'Invalid bid amount' },
        { status: 400 }
      );
    }

    // Validation: minimum bid for new slots
    if (mode === 'new' && bid_eur < config.minBidEur) {
      return NextResponse.json(
        { error: `Minimum bid is ${config.minBidEur} EUR` },
        { status: 400 }
      );
    }

    // Validation: bid must be higher than current for outbid
    if (mode === 'outbid' && slot_id) {
      const { data: slot, error: slotError } = await supabase
        .from('slots')
        .select('current_bid_eur')
        .eq('id', slot_id)
        .single();

      if (slotError || !slot) {
        return NextResponse.json(
          { error: 'Slot not found' },
          { status: 404 }
        );
      }

      if (bid_eur <= slot.current_bid_eur) {
        return NextResponse.json(
          { error: `Bid must be higher than current bid of ${slot.current_bid_eur} EUR` },
          { status: 400 }
        );
      }
    }

    // Validation: link_url
    if (!link_url || !link_url.startsWith('https://')) {
      return NextResponse.json(
        { error: 'link_url must be a valid HTTPS URL' },
        { status: 400 }
      );
    }

    // Validation: display_name
    if (!display_name || display_name.length === 0 || display_name.length > 50) {
      return NextResponse.json(
        { error: 'display_name must be between 1 and 50 characters' },
        { status: 400 }
      );
    }

    // Validation: brand_color
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!brand_color || !hexColorRegex.test(brand_color)) {
      return NextResponse.json(
        { error: 'brand_color must be a valid hex color (e.g., #FF5733)' },
        { status: 400 }
      );
    }

    // Validation: image_url (if provided, must be from slot-images bucket)
    if (image_url && !image_url.includes('/slot-images/')) {
      return NextResponse.json(
        { error: 'image_url must be from the slot-images bucket' },
        { status: 400 }
      );
    }

    // Get user's email from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Calculate commission
    const commission_eur = bid_eur * config.commissionRate;

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        slot_id: slot_id || null,
        type: 'bid',
        amount_eur: bid_eur,
        commission_eur: commission_eur,
        status: 'pending',
        is_anonymous,
      })
      .select('id')
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction creation error:', transactionError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: profile.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'The Last Billboard - Bid',
              description: `Bid for ${display_name}`,
            },
            unit_amount: Math.round(bid_eur * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/${locale}/bid/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/${locale}/bid/cancel`,
      metadata: {
        transaction_id: transaction.id,
        user_id: user.id,
        mode: mode,
        slot_id: slot_id || '',
        bid_eur: bid_eur.toFixed(2),
        image_url: image_url || '',
        link_url: link_url,
        display_name: display_name,
        brand_color: brand_color,
        is_anonymous: is_anonymous ? '1' : '0',
      },
    });

    // Persist stripe_session_id via service-role client. The user-auth
    // client has no UPDATE policy on transactions, so this would fail
    // silently otherwise — leaving us unable to reconcile the row when
    // the webhook arrives. See scripts/recover-pending-transactions.mjs
    // for the recovery path used on rows that hit this bug historically.
    const serviceRole = createServiceRoleClient();
    const { error: updateError } = await serviceRole
      .from('transactions')
      .update({ stripe_session_id: session.id })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Failed to update transaction with session ID:', updateError);
      return NextResponse.json(
        { error: 'Failed to link Stripe session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
