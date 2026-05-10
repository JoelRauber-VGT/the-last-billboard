import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Self-service data export (Art. 20 DSGVO).
 * Returns a JSON file containing every record we hold that's keyed to the
 * authenticated user. Read-only; relies on existing RLS so it never leaks
 * other users' data.
 */
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'auth_required' },
      { status: 401 }
    )
  }

  const userId = user.id

  // Fetch in parallel; each query is RLS-restricted to the caller. Wrap in
  // try/catch so a single rejected query doesn't crash the route handler with
  // an unhandled exception — caller gets a clean 500 JSON instead.
  let profileRes, slotsRes, slotHistoryRes, transactionsRes,
      reportsRes, revealOutgoingRes, revealIncomingRes, notificationsRes
  try {
    [
      profileRes,
      slotsRes,
      slotHistoryRes,
      transactionsRes,
      reportsRes,
      revealOutgoingRes,
      revealIncomingRes,
      notificationsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('slots').select('*').eq('current_owner_id', userId),
      supabase.from('slot_history').select('*').eq('owner_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId),
      supabase.from('reports').select('*').eq('reporter_id', userId),
      supabase.from('reveal_requests').select('*').eq('requester_id', userId),
      supabase.from('reveal_requests').select('*').eq('target_owner_id', userId),
      supabase.from('notifications').select('*').eq('user_id', userId),
    ])
  } catch (err) {
    console.error('[account/export] data fetch failed', { userId, error: err })
    return NextResponse.json(
      { error: 'Export failed', code: 'export_failed' },
      { status: 500 }
    )
  }

  const payload = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    profile: profileRes.data ?? null,
    slots: slotsRes.data ?? [],
    slot_history: slotHistoryRes.data ?? [],
    transactions: transactionsRes.data ?? [],
    reports: reportsRes.data ?? [],
    reveal_requests: {
      outgoing: revealOutgoingRes.data ?? [],
      incoming: revealIncomingRes.data ?? [],
    },
    notifications: notificationsRes.data ?? [],
  }

  const filename = `last-billboard-export-${userId}-${Date.now()}.json`
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
