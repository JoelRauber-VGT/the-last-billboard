import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * DB-backed sliding-window rate limit. Returns true if the caller may
 * proceed. Backed by public.check_and_record_rate_limit (see migration
 * 014_rate_limit_events.sql) which atomically counts + inserts to avoid
 * TOCTOU races between the count and the insert.
 *
 * Intended for endpoints without a natural domain table to count against.
 * For endpoints where a domain table already records every attempt (e.g.
 * /api/reports counts the reports table itself), prefer that approach to
 * avoid a second write on the hot path.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('check_and_record_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail closed on infra errors — better to surface a 500 than silently
    // disable the limit when something's wrong with the DB.
    console.error('Rate-limit RPC error:', error);
    return { allowed: false, error: 'Rate limit check failed' };
  }

  return { allowed: data === true };
}
