import { checkAdminAuth } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const removeSchema = z.object({
  reportId: z.string().uuid(),
  slotId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 })
  }

  const { user, supabase } = auth

  try {
    const body = await request.json()
    const { reportId, slotId } = removeSchema.parse(body)

    // Get slot details for refund
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('current_owner_id, current_bid_eur')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    // Update slot status to removed
    const { error: updateError } = await supabase
      .from('slots')
      .update({ status: 'removed' })
      .eq('id', slotId)

    if (updateError) {
      console.error('Failed to remove slot:', updateError)
      return NextResponse.json({ error: 'Failed to remove slot' }, { status: 500 })
    }

    // Create refund transaction if there's an owner
    if (slot.current_owner_id) {
      const { error: refundError } = await supabase
        .from('transactions')
        .insert({
          user_id: slot.current_owner_id,
          slot_id: slotId,
          type: 'refund',
          amount_eur: slot.current_bid_eur,
          commission_eur: 0,
          status: 'pending',
        })

      if (refundError) {
        console.error('Failed to create refund:', refundError)
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
      details: { reportId, refund: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Error removing slot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
