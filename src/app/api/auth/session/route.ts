import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/auth/session — returns minimal session info (email) for the
 * current browser cookie. Used by /bid/success to render a personalised
 * confirmation line ("confirmation sent to <email>"). Anonymous callers
 * receive `{ user: null }` — no 401, because the endpoint is advisory.
 */
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  })
}
