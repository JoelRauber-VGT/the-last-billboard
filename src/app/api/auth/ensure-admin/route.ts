import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient, createServiceRoleClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit/checkRateLimit'

/**
 * Checks whether the current authenticated user is admin, and — if
 * the server is explicitly configured with ADMIN_BOOTSTRAP_EMAIL and
 * no admin yet exists — claims admin for that single pre-authorized
 * email. Without the env var, this endpoint never grants privileges;
 * it only reports current is_admin status.
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'auth_required' },
        { status: 401 }
      )
    }

    // Rate limit per user. The bootstrap path is single-shot, but the
    // post-bootstrap branch still runs a profiles read on every call;
    // limiting prevents cheap DB-thrashing from a compromised cookie.
    const rl = await checkRateLimit(supabase, `ensure-admin:${user.id}`, 5, 600)
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: rl.error ?? 'Too many requests',
          code: rl.error ? 'rate_check_failed' : 'rate_limited',
        },
        { status: rl.error ? 500 : 429 }
      )
    }

    // Cross-user read: profiles RLS only exposes self/admins, so a non-admin
    // user-bound client cannot see whether other admins exist. Use the service
    // role for this check — bootstrap correctness depends on a global view.
    const adminClient = createServiceRoleClient()
    const { data: existingAdmins, error: adminCheckError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(1)

    if (adminCheckError) {
      console.error('Error checking for existing admins:', adminCheckError)
      return NextResponse.json(
        { error: 'Database error', code: 'database_error' },
        { status: 500 }
      )
    }

    const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase()
    const userEmail = user.email?.trim().toLowerCase()
    const noAdminsExist = !existingAdmins || existingAdmins.length === 0
    const canBootstrap =
      noAdminsExist &&
      bootstrapEmail !== undefined &&
      bootstrapEmail.length > 0 &&
      userEmail !== undefined &&
      userEmail === bootstrapEmail

    if (canBootstrap) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error setting bootstrap admin:', updateError)
        return NextResponse.json(
          { error: 'Failed to set admin', code: 'admin_toggle_failed' },
          { status: 500 }
        )
      }

      console.log(`Bootstrap admin granted to ${user.id} (${userEmail})`)
      return NextResponse.json({
        success: true,
        message: 'Bootstrap admin granted',
        is_admin: true,
      })
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Admin check completed',
      is_admin: currentProfile?.is_admin || false,
    })
  } catch (error) {
    console.error('Unexpected error in ensure-admin:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'internal_error' },
      { status: 500 }
    )
  }
}
