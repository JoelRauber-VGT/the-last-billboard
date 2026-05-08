import { cache } from 'react';
import { createServerClient as createSsrClient } from '@supabase/ssr';
import { config } from '@/lib/config';

/**
 * Read the freeze date from app_settings. Memoized per request via React
 * `cache` so multiple consumers in the same render don't fan out queries.
 *
 * We use an anon-key SSR client without cookies — the row is publicly
 * readable (RLS) and we don't need user context here. This avoids the
 * `cookies()` async dependency, which means the helper is safe to call
 * from anywhere, including webhooks that run with service-role.
 *
 * Falls back to `config.billboardEndsAt` if the row is missing or the
 * query fails, so the app stays functional even before migration runs.
 */
export const getFreezeDate = cache(async (): Promise<Date> => {
  try {
    const supabase = createSsrClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // no-op
          },
        },
      }
    );
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'billboard_ends_at')
      .maybeSingle();

    if (!error && data?.value) {
      const raw = data.value as unknown;
      const iso = typeof raw === 'string' ? raw : String(raw);
      const parsed = new Date(iso);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[getFreezeDate] falling back to config default:', e);
  }
  return config.billboardEndsAt;
});

export async function isBillboardFrozenAsync(): Promise<boolean> {
  const end = await getFreezeDate();
  return Date.now() >= end.getTime();
}

export async function throwIfFrozenAsync(): Promise<void> {
  if (await isBillboardFrozenAsync()) {
    throw new Error('Billboard is frozen. No more bids accepted.');
  }
}

export async function getFreezeStatusAsync() {
  const now = Date.now();
  const end = (await getFreezeDate()).getTime();
  const timeRemaining = end - now;
  return {
    isFrozen: timeRemaining <= 0,
    endsAt: new Date(end),
    timeRemaining: Math.max(0, timeRemaining),
  };
}
