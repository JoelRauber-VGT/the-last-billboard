import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MIN_LEN = 2
const MAX_LEN = 50
// Letters (incl. unicode), digits, space, dot, dash, underscore
const ALLOWED = /^[\p{L}\p{N} ._-]+$/u

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = (searchParams.get('name') ?? '').trim()

  if (raw.length === 0) {
    return NextResponse.json({ available: false, reason: 'empty' })
  }
  if (raw.length < MIN_LEN) {
    return NextResponse.json({ available: false, reason: 'too_short' })
  }
  if (raw.length > MAX_LEN) {
    return NextResponse.json({ available: false, reason: 'too_long' })
  }
  if (!ALLOWED.test(raw)) {
    return NextResponse.json({ available: false, reason: 'invalid_chars' })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Case-insensitive match, excluding the requesting user (so they can keep
  // their existing name on a no-op save).
  let query = supabase
    .from('public_profiles')
    .select('id', { count: 'exact', head: true })
    .ilike('display_name', raw)

  if (user?.id) {
    query = query.neq('id', user.id)
  }

  const { count, error } = await query

  if (error) {
    console.error('check-display-name query failed', error)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }

  return NextResponse.json({ available: (count ?? 0) === 0 })
}
