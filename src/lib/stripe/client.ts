import { loadStripe, Stripe } from '@stripe/stripe-js';

/**
 * Client-side Stripe instance
 * Cached promise to avoid re-creating the Stripe object
 */
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get Stripe client for browser-side operations
 * Use this in Client Components
 */
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
    }

    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}
