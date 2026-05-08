import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient, createServiceRoleClient } from '@/lib/supabase/server'
import { deleteAllUserImages } from '@/lib/storage/slotImages'

const ANONYMIZED_NAME = '[deleted account]'

/**
 * Self-service account deletion (Art. 17 DSGVO).
 *
 * Strategy:
 *   1. Authenticate via the user's session.
 *   2. Anonymize the user's footprint where it cannot be deleted without
 *      destroying the financial/historical record (transactions, slot_history,
 *      currently-active slots).
 *   3. Hard-delete all of the user's slot images from storage.
 *   4. Delete the auth.users row → cascades to profiles, notifications,
 *      reveal_requests. Transactions / slot_history.owner_id / slots.current_owner_id
 *      are FK SET NULL by schema.
 *
 * Active slots are marked status='removed' and stripped of PII (image, link,
 * display_name) but the bid record remains. No automatic refund — voluntary
 * deletion is not the same as admin-removal-for-cause.
 */
export async function POST(_request: NextRequest) {
  const userClient = await createServerActionClient()
  const { data: { user } } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id
  const admin = createServiceRoleClient()

  // 1. Strip PII from currently-active slots owned by the user, and mark them removed.
  const { error: slotsError } = await admin
    .from('slots')
    .update({
      display_name: ANONYMIZED_NAME,
      image_url: null,
      link_url: '',
      brand_color: null,
      is_anonymous: true,
      status: 'removed',
    })
    .eq('current_owner_id', userId)

  if (slotsError) {
    console.error('[account/delete] failed to anonymize slots:', slotsError)
    return NextResponse.json({ error: 'Failed to clean up slots' }, { status: 500 })
  }

  // 2. Anonymize slot_history rows where this user was the owner.
  const { error: historyError } = await admin
    .from('slot_history')
    .update({
      display_name: ANONYMIZED_NAME,
      image_url: null,
      link_url: null,
      is_anonymous: true,
    })
    .eq('owner_id', userId)

  if (historyError) {
    console.error('[account/delete] failed to anonymize history:', historyError)
    // continue — not blocking, but caller will see partial state on retry
  }

  // 3. Delete all of the user's uploaded images.
  const imgResult = await deleteAllUserImages(admin, userId)

  // 4. Delete the auth user. Cascades through `profiles` (and downstream tables).
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)

  if (authDeleteError) {
    console.error('[account/delete] failed to delete auth user:', authDeleteError)
    return NextResponse.json(
      { error: 'Failed to delete account', detail: authDeleteError.message },
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
