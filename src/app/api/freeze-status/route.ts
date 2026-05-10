import { NextResponse } from 'next/server';
import { apiError } from '@/lib/errors/apiError';
import { getFreezeStatusAsync } from '@/lib/freeze/getFreezeDate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getFreezeStatusAsync();
    return NextResponse.json({
      isFrozen: status.isFrozen,
      endsAt: status.endsAt.toISOString(),
      timeRemaining: status.timeRemaining,
    });
  } catch (error) {
    // Without the wrapper a Supabase / DB outage crashed the route and
    // produced a 500 HTML error page — clients expecting JSON would fail
    // to parse it. Now we always return JSON with a stable code.
    return apiError('freeze_status_unavailable', 500, {
      cause: error,
      logContext: { route: 'freeze-status' },
    });
  }
}
