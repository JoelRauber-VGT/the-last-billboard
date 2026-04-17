import { checkAdminAuth } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const dismissSchema = z.object({
  reportId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 })
  }

  const { user, supabase } = auth

  try {
    const body = await request.json()
    const { reportId } = dismissSchema.parse(body)

    // Update report status
    const { error } = await supabase
      .from('reports')
      .update({
        status: 'dismissed',
        resolved_at: new Date().toISOString(),
        resolved_by_id: user.id,
      })
      .eq('id', reportId)

    if (error) {
      console.error('Failed to dismiss report:', error)
      return NextResponse.json({ error: 'Failed to dismiss report' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction({
      adminId: user.id,
      action: 'dismiss_report',
      targetType: 'report',
      targetId: reportId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Error dismissing report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
