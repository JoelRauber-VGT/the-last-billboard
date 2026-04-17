import { checkAdminAuth } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const hideSchema = z.object({
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
    const { slotId } = hideSchema.parse(body)

    // Update slot status to removed
    const { error } = await supabase
      .from('slots')
      .update({ status: 'removed' })
      .eq('id', slotId)

    if (error) {
      console.error('Failed to hide slot:', error)
      return NextResponse.json({ error: 'Failed to hide slot' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction({
      adminId: user.id,
      action: 'hide_slot',
      targetType: 'slot',
      targetId: slotId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Error hiding slot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
