import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin/auth';
import { processRefunds } from '@/lib/stripe/processRefunds';

/**
 * POST /api/admin/process-refunds
 * Manually trigger refund processing.
 * Returns 404 on non-admin (matches every other /api/admin/* endpoint —
 * do not leak route existence).
 */
export async function POST() {
  const auth = await checkAdminAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    console.log(`[${new Date().toISOString()}] Admin ${auth.user.id} triggered refund processing`);

    const results = await processRefunds();

    console.log(`[${new Date().toISOString()}] Refund processing complete:`, results);

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Error processing refunds:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
