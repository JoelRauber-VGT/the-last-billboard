import { NextResponse } from 'next/server';
import { getFreezeStatus } from '@/lib/freeze/checkFrozen';

export async function GET() {
  const status = getFreezeStatus();
  return NextResponse.json(status);
}
