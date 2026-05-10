import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin/auth';
import { apiError } from '@/lib/errors/apiError';
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
    return NextResponse.json(
      { error: 'Not found', code: 'forbidden' },
      { status: 404 }
    );
  }

  try {
    console.log(`[${new Date().toISOString()}] Admin ${auth.user.id} triggered refund processing`);

    const results = await processRefunds();

    console.log(`[${new Date().toISOString()}] Refund processing complete:`, results);

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    // Never leak the underlying error / stack to the client — apiError logs
    // the cause server-side and returns only a stable code + generic label.
    return apiError('refund_processing_failed', 500, {
      cause: error,
      logContext: { route: 'admin/process-refunds', adminId: auth.user.id },
    });
  }
}
