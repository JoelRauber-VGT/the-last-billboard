import { NextResponse } from 'next/server';
import { getFreezeStatusAsync } from '@/lib/freeze/getFreezeDate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getFreezeStatusAsync();
  return NextResponse.json({
    isFrozen: status.isFrozen,
    endsAt: status.endsAt.toISOString(),
    timeRemaining: status.timeRemaining,
  });
}
