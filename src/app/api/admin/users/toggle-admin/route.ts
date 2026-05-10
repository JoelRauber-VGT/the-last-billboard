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
    return NextResponse.json(
      { error: 'Unauthorized', code: 'forbidden' },
      { status: 404 }
    )
  }

  const { user, supabase } = auth

  try {
    const body = await request.json()
    const { userId, isAdmin } = toggleAdminSchema.parse(body)

    // Application-Layer-Check: User darf sich nicht selbst demoten (UX).
    // Die SQL-Function schützt zusätzlich atomar gegen den Last-Admin-Demote
    // durch beliebige Caller (Race-Condition-Hardening, Bug #6).
    if (userId === user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Cannot demote yourself', code: 'self_demote' },
        { status: 400 }
      )
    }

    // Atomarer Toggle: lockt Admin-Rows FOR UPDATE, prüft Last-Admin-Constraint
    // und führt UPDATE in einer Transaktion aus. Verhindert Race-Conditions,
    // bei denen parallele Demote-Requests beide passieren und 0 Admins
    // hinterlassen würden.
    const { error } = await supabase.rpc('safe_set_admin', {
      p_target_user_id: userId,
      p_make_admin: isAdmin,
    })

    if (error) {
      // Postgres RAISE EXCEPTION 'last_admin' wird von supabase-js als
      // error.message bzw. error.details propagiert.
      const message = `${error.message ?? ''} ${error.details ?? ''}`
      if (message.includes('last_admin')) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin', code: 'last_admin' },
          { status: 409 }
        )
      }

      console.error('Failed to toggle admin status:', error)
      return NextResponse.json(
        { error: 'Failed to toggle admin status', code: 'admin_toggle_failed' },
        { status: 500 }
      )
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
      return NextResponse.json(
        { error: 'Invalid input', code: 'invalid_input' },
        { status: 400 }
      )
    }
    console.error('Error toggling admin status:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'internal_error' },
      { status: 500 }
    )
  }
}
