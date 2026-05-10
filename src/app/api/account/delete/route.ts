import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient, createServiceRoleClient } from '@/lib/supabase/server'
import { deleteAllUserImages } from '@/lib/storage/slotImages'

/**
 * Self-service account deletion (Art. 17 DSGVO).
 *
 * Strategy:
 *   1. Authenticate via the user's session.
 *   2. Atomic anonymization via the `delete_account` SQL function — wraps the
 *      previous step-1+step-2 mutations (slots PII strip, slot_history PII strip)
 *      in a single Postgres transaction. If any inner statement fails, Postgres
 *      rolls back the whole function. Idempotent across retries.
 *   3. Hard-delete all of the user's slot images from storage (best-effort).
 *   4. Delete the auth.users row → cascades to profiles, notifications,
 *      reveal_requests. Transactions / slot_history.owner_id / slots.current_owner_id
 *      are FK SET NULL by schema.
 *
 * Failure mode: if step 4 fails after step 2 succeeds, the user's app data is
 * fully anonymized (DSGVO-compliant) but the auth row still exists. Logged as
 * critical and returned with code='partial_delete'; user-facing data leakage
 * is impossible because step 2 already committed.
 *
 * Active slots are marked status='removed' and stripped of PII. No automatic
 * refund — voluntary deletion is not the same as admin-removal-for-cause.
 */
export async function POST(_request: NextRequest) {
  const userClient = await createServerActionClient()
  const { data: { user } } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'auth_required' },
      { status: 401 }
    )
  }

  const userId = user.id
  const admin = createServiceRoleClient()

  // 1+2. Atomic anonymization (slots + slot_history) in a single transaction.
  const { error: rpcError } = await admin.rpc('delete_account', { p_user_id: userId })

  if (rpcError) {
    console.error('[account/delete] delete_account RPC failed', { userId, error: rpcError })
    return NextResponse.json(
      { error: 'Failed to delete account', code: 'delete_failed' },
      { status: 500 }
    )
  }

  // 3. Delete all of the user's uploaded images. Best-effort — image deletion is
  //    idempotent and can be retried by an admin if a few entries remain.
  const imgResult = await deleteAllUserImages(admin, userId)

  // 4. Delete the auth user. Cascades through `profiles` (and downstream tables).
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)

  if (authDeleteError) {
    // App data is already anonymized + committed. Auth row is the only thing left.
    // The user could theoretically still log in but would see an empty state.
    console.error('[account/delete] data anonymized but auth-delete failed', {
      userId,
      error: authDeleteError,
    })
    return NextResponse.json(
      { error: 'Failed to delete account', code: 'partial_delete' },
      { status: 500 }
    )
  }

  // Sign the (now-orphaned) browser session out so cookies don't linger.
  await userClient.auth.signOut().catch(() => {})

  return NextResponse.json({
    success: true,
    images_removed: imgResult.removed,
    images_failed: imgResult.failed,
  })
}
