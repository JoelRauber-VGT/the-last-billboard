import { checkAdminAuth } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/audit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const toggleAdminSchema = z.object({
  userId: z.string().uuid(),
  isAdmin: z.boolean(),
})

export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 })
  }

  const { user, supabase } = auth

  try {
    const body = await request.json()
    const { userId, isAdmin } = toggleAdminSchema.parse(body)

    // Prevent self-demotion if last admin
    if (userId === user.id && !isAdmin) {
      // Check if there are other admins
      const { data: admins, error: adminCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true)

      if (adminCheckError) {
        console.error('Failed to check admin count:', adminCheckError)
        return NextResponse.json({ error: 'Failed to check admin status' }, { status: 500 })
      }

      if (admins && admins.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote yourself as you are the last admin' },
          { status: 400 }
        )
      }
    }

    // Update user admin status
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId)

    if (error) {
      console.error('Failed to toggle admin status:', error)
      return NextResponse.json({ error: 'Failed to toggle admin status' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction({
      adminId: user.id,
      action: isAdmin ? 'grant_admin' : 'revoke_admin',
      targetType: 'user',
      targetId: userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Error toggling admin status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
