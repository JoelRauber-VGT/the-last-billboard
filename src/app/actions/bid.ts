'use server';

import { createServerActionClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { throwIfFrozenAsync } from '@/lib/freeze/getFreezeDate';
import { getStripe } from '@/lib/stripe/server';
import { isSupabaseStoragePublicUrl } from '@/lib/storage/slotImages';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';

// Validation schema for bid data. `display_name` is no longer accepted from
// the client — the server reads the bidder's profile.display_name and uses
// that for both the Stripe line item and the eventual slot record. This means
// changes to the user's profile name automatically propagate to all their
// slots, and there is no longer a per-bid name override to keep in sync.
const bidFormSchema = z.object({
  image_url: z.string().url().optional(),
  link_url: z.string().url().startsWith('https://', 'Must be a valid HTTPS URL'),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  bid_eur: z.number().positive('Bid must be positive').multipleOf(0.01, 'Bid must be in cents'),
  outbid_slot_id: z.string().uuid().optional(),
  pan_x: z.number().min(0).max(1).default(0.5),
  pan_y: z.number().min(0).max(1).default(0.5),
  zoom: z.number().min(1.0).max(3.0).default(1.0),
  is_anonymous: z.boolean().default(false),
});

type BidFormData = z.infer<typeof bidFormSchema>;

export type BidCheckoutResult = {
  success: boolean;
  url?: string;
  error?: string;
  code?: string;
};

/**
 * Validates URL to prevent XSS and injection attacks
 */
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow https protocol
    if (parsed.protocol !== 'https:') {
      return false;
    }
    // Disallow javascript:, data:, etc.
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('vbscript:')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Server-side MIME type validation via HEAD request.
 *
 * SSRF hardening: callers MUST gate this with isSupabaseStoragePublicUrl()
 * first. The HEAD request fetches an attacker-controlled URL, so without
 * an origin allowlist this would let clients probe internal services
 * (cloud-metadata, localhost admin ports, RFC1918 hosts) by observing
 * response headers / timing. We re-assert the allowlist here as defense
 * in depth in case a future caller forgets.
 */
async function validateImageMimeType(imageUrl: string): Promise<boolean> {
  if (!isSupabaseStoragePublicUrl(imageUrl)) {
    return false;
  }
  try {
    const response = await fetch(imageUrl, {
      method: 'HEAD',
    });
    const contentType = response.headers.get('content-type');
    return contentType !== null && config.allowedImageTypes.includes(contentType as typeof config.allowedImageTypes[number]);
  } catch {
    return false;
  }
}

/**
 * Creates a Stripe Checkout session for a new or outbid slot
 */
export async function createBidCheckoutSession(
  formData: BidFormData
): Promise<BidCheckoutResult> {
  try {
    // Check if billboard is frozen
    try {
      await throwIfFrozenAsync();
    } catch (freezeError) {
      return {
        success: false,
        error: 'Billboard is frozen. No more bids accepted.',
        code: 'billboard_frozen',
      };
    }

    const supabase = await createServerActionClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to bid',
        code: 'auth_required',
      };
    }

    // Validate form data
    const validationResult = bidFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues?.[0];
      return {
        success: false,
        error: firstError?.message || 'Invalid form data',
        code: 'invalid_input',
      };
    }

    const data = validationResult.data;

    // Validate URL
    if (!validateUrl(data.link_url)) {
      return {
        success: false,
        error: 'Invalid URL format',
        code: 'invalid_link_url',
      };
    }

    // Server-side image validation if image provided.
    // We gate on origin BEFORE the HEAD fetch (see validateImageMimeType
    // for the SSRF rationale). Returning early with a distinct code makes
    // the rejection unambiguous at the call site too.
    if (data.image_url) {
      if (!isSupabaseStoragePublicUrl(data.image_url)) {
        return {
          success: false,
          error: 'Image URL not allowed',
          code: 'invalid_image_url',
        };
      }
      const isValidImage = await validateImageMimeType(data.image_url);
      if (!isValidImage) {
        return {
          success: false,
          error: 'Invalid image file',
          code: 'invalid_image_type',
        };
      }
    }

    // If outbid mode, verify slot exists and bid is higher
    let minBid = config.minBidEur;
    if (data.outbid_slot_id) {
      const { data: slot, error: slotError } = await supabase
        .from('slots')
        .select('id, current_bid_eur, display_name, current_owner_id')
        .eq('id', data.outbid_slot_id)
        .eq('status', 'active')
        .single();

      if (slotError || !slot) {
        return {
          success: false,
          error: 'Slot not found',
          code: 'slot_not_found',
        };
      }

      // Check if user is trying to outbid their own slot
      if (slot.current_owner_id === user.id) {
        return {
          success: false,
          error: 'You cannot outbid your own slot',
          code: 'self_outbid',
        };
      }

      minBid = slot.current_bid_eur + 0.01;
      if (data.bid_eur < minBid) {
        return {
          success: false,
          error: `Your bid must be at least €${minBid.toFixed(2)}`,
          code: 'bid_too_low',
        };
      }
    } else {
      // New slot mode
      if (data.bid_eur < config.minBidEur) {
        return {
          success: false,
          error: `Minimum bid is €${config.minBidEur.toFixed(2)}`,
          code: 'bid_too_low',
        };
      }
    }

    // Get user's email + display_name from profiles table. The display_name is
    // sourced server-side instead of taken from the form, so the bid form
    // cannot override the user's identity per-slot.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found',
        code: 'profile_not_found',
      };
    }

    const profileTyped = profile as { email: string; display_name: string | null };
    const resolvedDisplayName =
      profileTyped.display_name?.trim() ||
      profileTyped.email?.split('@')[0] ||
      'user';

    // Calculate commission
    const commission_eur = data.bid_eur * config.commissionRate;

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        slot_id: data.outbid_slot_id || null,
        type: 'bid',
        amount_eur: data.bid_eur,
        commission_eur: commission_eur,
        status: 'pending',
        is_anonymous: data.is_anonymous,
      })
      .select('id')
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction creation error:', transactionError);
      return {
        success: false,
        error: 'Failed to create transaction',
        code: 'transaction_create_failed',
      };
    }

    // Create Stripe Checkout Session
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const locale = (await getLocale()) || config.defaultLocale;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: profileTyped.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'The Last Billboard - Bid',
              description: `Bid for ${resolvedDisplayName}`,
            },
            unit_amount: Math.round(data.bid_eur * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/${locale}/bid/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/${locale}/bid/cancel`,
      metadata: {
        transaction_id: transaction.id,
        user_id: user.id,
        mode: data.outbid_slot_id ? 'outbid' : 'new',
        slot_id: data.outbid_slot_id || '',
        bid_eur: data.bid_eur.toFixed(2),
        image_url: data.image_url || '',
        link_url: data.link_url,
        display_name: resolvedDisplayName,
        brand_color: data.brand_color,
        pan_x: data.pan_x.toString(),
        pan_y: data.pan_y.toString(),
        zoom: data.zoom.toString(),
        is_anonymous: data.is_anonymous ? '1' : '0',
      },
    });

    // Update transaction with stripe_session_id
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ stripe_session_id: session.id })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Failed to update transaction with session ID:', updateError);
      // Continue anyway, as the session was created
    }

    return {
      success: true,
      url: session.url || undefined,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      code: 'internal_error',
    };
  }
}
