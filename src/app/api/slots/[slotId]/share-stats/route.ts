import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const { slotId } = await params
  if (!UUID_RE.test(slotId)) {
    return NextResponse.json({ error: 'invalid_slot' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Owner check: slot_share_events RLS already enforces this, but we still
  // want a clean 403 instead of a silently-empty response.
  const { data: slot } = await supabase
    .from('slots')
    .select('current_owner_id')
    .eq('id', slotId)
    .maybeSingle()
  if (!slot || (slot as { current_owner_id: string | null }).current_owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { data: rows } = await supabase
    .from('slot_share_events')
    .select('kind')
    .eq('slot_id', slotId)
    .limit(10000)

  const events = (rows ?? []) as { kind: 'share' | 'click' }[]
  let shareCount = 0
  let clickCount = 0
  for (const e of events) {
    if (e.kind === 'share') shareCount += 1
    else if (e.kind === 'click') clickCount += 1
  }

  return NextResponse.json({ shareCount, clickCount })
}
