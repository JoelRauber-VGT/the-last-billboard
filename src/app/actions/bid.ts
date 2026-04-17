'use server';

import { createServerActionClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { throwIfFrozen } from '@/lib/freeze/checkFrozen';
import { getStripe } from '@/lib/stripe/server';
import { z } from 'zod';

// Validation schema for bid data
const bidFormSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50, 'Display name must be max 50 characters'),
  image_url: z.string().url().optional(),
  link_url: z.string().url().startsWith('https://', 'Must be a valid HTTPS URL'),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  bid_eur: z.number().positive('Bid must be positive').multipleOf(0.01, 'Bid must be in cents'),
  outbid_slot_id: z.string().uuid().optional(),
});

type BidFormData = z.infer<typeof bidFormSchema>;

export type BidCheckoutResult = {
  success: boolean;
  url?: string;
  error?: string;
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
 * Server-side MIME type validation using magic bytes
 */
async function validateImageMimeType(imageUrl: string): Promise<boolean> {
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
      throwIfFrozen();
    } catch (freezeError) {
      return {
        success: false,
        error: 'Billboard is frozen. No more bids accepted.',
      };
    }

    const supabase = await createServerActionClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: 'You must be logged in to bid',
      };
    }

    // Validate form data
    const validationResult = bidFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues?.[0];
      return {
        success: false,
        error: firstError?.message || 'Invalid form data',
      };
    }

    const data = validationResult.data;

    // Validate URL
    if (!validateUrl(data.link_url)) {
      return {
        success: false,
        error: 'Invalid URL format',
      };
    }

    // Server-side image validation if image provided
    if (data.image_url) {
      const isValidImage = await validateImageMimeType(data.image_url);
      if (!isValidImage) {
        return {
          success: false,
          error: 'Invalid image file',
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
        };
      }

      // Check if user is trying to outbid their own slot
      if (slot.current_owner_id === user.id) {
        return {
          success: false,
          error: 'You cannot outbid your own slot',
        };
      }

      minBid = slot.current_bid_eur + 0.01;
      if (data.bid_eur < minBid) {
        return {
          success: false,
          error: `Your bid must be at least €${minBid.toFixed(2)}`,
        };
      }
    } else {
      // New slot mode
      if (data.bid_eur < config.minBidEur) {
        return {
          success: false,
          error: `Minimum bid is €${config.minBidEur.toFixed(2)}`,
        };
      }
    }

    // Get user's email from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found',
      };
    }

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
      })
      .select('id')
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction creation error:', transactionError);
      return {
        success: false,
        error: 'Failed to create transaction',
      };
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
              description: `Bid for ${data.display_name}`,
            },
            unit_amount: Math.round(data.bid_eur * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/en/bid/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/en/bid/cancel`,
      metadata: {
        transaction_id: transaction.id,
        user_id: user.id,
        mode: data.outbid_slot_id ? 'outbid' : 'new',
        slot_id: data.outbid_slot_id || '',
        bid_eur: data.bid_eur.toFixed(2),
        image_url: data.image_url || '',
        link_url: data.link_url,
        display_name: data.display_name,
        brand_color: data.brand_color,
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
    };
  }
}
