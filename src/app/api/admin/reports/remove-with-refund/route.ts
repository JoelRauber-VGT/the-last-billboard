import { checkAdminAuth } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/audit'
import { processRefunds } from '@/lib/stripe/processRefunds'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { deleteSlotImageByUrl } from '@/lib/storage/slotImages'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const removeSchema = z.object({
  reportId: z.string().uuid(),
  slotId: z.string().uuid(),
  // Refund share of the original bid in percent. 90 = standard policy
  // (10% platform fee retained). 0 = no refund. 100 = goodwill / full refund.
  refundPercent: z.number().int().min(0).max(100).default(90),
})

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'forbidden' },
      { status: 404 }
    )
  }

  const { user, supabase } = auth

  try {
    const body = await request.json()
    const { reportId, slotId, refundPercent } = removeSchema.parse(body)

    // Get slot details for refund + storage cleanup
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('current_owner_id, current_bid_eur, image_url')
      .eq('id', slotId)
      .single<{ current_owner_id: string | null; current_bid_eur: number; image_url: string | null }>()

    if (slotError || !slot) {
      return NextResponse.json(
        { error: 'Slot not found', code: 'slot_not_found' },
        { status: 404 }
      )
    }

    // Update slot status to removed
    const { error: updateError } = await supabase
      .from('slots')
      .update({ status: 'removed' })
      .eq('id', slotId)

    if (updateError) {
      console.error('Failed to remove slot:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove slot', code: 'remove_failed' },
        { status: 500 }
      )
    }

    // Best-effort: drop the image from storage so the public URL stops
    // resolving even though the slot row is preserved for history.
    if (slot.image_url) {
      const result = await deleteSlotImageByUrl(createServiceRoleClient(), slot.image_url)
      if (!result.ok) {
        console.error('[admin/remove-with-refund] storage cleanup failed:', result.error)
      }
    }

    // Split the original bid into refund + retained platform fee, rounded
    // to cents so both sides reconcile exactly with what Stripe will charge.
    const refundAmountEur =
      Math.round(slot.current_bid_eur * (refundPercent / 100) * 100) / 100
    const commissionEur =
      Math.round((slot.current_bid_eur - refundAmountEur) * 100) / 100

    // Create refund transaction if there's an owner AND the percent > 0,
    // then kick off Stripe processing so the refund doesn't sit indefinitely
    // in `pending` (the worker is only invoked manually via
    // /api/admin/process-refunds). At 0% we skip the refund row entirely so
    // nothing reaches Stripe — the slot is just removed.
    //
    // Idempotency: a partial unique index
    // (transactions_one_pending_refund_per_user_slot, migration 022)
    // guarantees at most one open refund per (user_id, slot_id). A
    // double-click or a parallel admin therefore hits a unique violation
    // (Postgres SQLSTATE 23505) which we surface as 409. This keeps the
    // dedupe atomic — no read-then-write window where two requests both see
    // "no pending refund" and insert.
    let refundQueued = false
    if (slot.current_owner_id && refundAmountEur > 0) {
      const { error: refundError } = await supabase
        .from('transactions')
        .insert({
          user_id: slot.current_owner_id,
          slot_id: slotId,
          type: 'refund',
          amount_eur: refundAmountEur,
          commission_eur: commissionEur,
          status: 'pending',
        })

      if (refundError) {
        if (refundError.code === '23505') {
          // Pending refund already exists for this (user, slot). Don't
          // queue another one and don't proceed with the rest of the
          // workflow — the original request is already handling it.
          console.warn(
            '[admin/remove-with-refund] duplicate refund insert blocked:',
            refundError.message,
          )
          return NextResponse.json(
            { error: 'Refund already pending', code: 'refund_already_pending' },
            { status: 409 },
          )
        }
        console.error('Failed to create refund:', refundError)
      } else {
        refundQueued = true
      }
    }

    // Update report status
    const { error: reportError } = await supabase
      .from('reports')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by_id: user.id,
      })
      .eq('id', reportId)

    if (reportError) {
      console.error('Failed to update report:', reportError)
    }

    // Log admin action
    await logAdminAction({
      adminId: user.id,
      action: 'remove_slot_with_refund',
      targetType: 'slot',
      targetId: slotId,
      details: {
        reportId,
        refundPercent,
        refundAmountEur,
        commissionEur,
        refund: refundQueued,
      },
    })

    // Auto-trigger Stripe refund processing if we queued a refund. Best-effort:
    // if Stripe is down we still return success for the slot removal — the
    // refund remains `pending` and can be retried via /api/admin/process-refunds.
    let refundResult: { processed: number; failed: number } | null = null
    if (refundQueued) {
      try {
        const result = await processRefunds()
        refundResult = { processed: result.processed, failed: result.failed }
      } catch (refundErr) {
        console.error('Auto-refund processing failed (will be retryable):', refundErr)
      }
    }

    return NextResponse.json({
      success: true,
      refund: refundResult,
      refundPercent,
      refundAmountEur,
      commissionEur,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'invalid_input' },
        { status: 400 }
      )
    }
    console.error('Error removing slot:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'internal_error' },
      { status: 500 }
    )
  }
}
