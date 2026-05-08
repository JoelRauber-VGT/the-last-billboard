import { checkAdminAuth } from '@/lib/admin/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 })
  }

  const { supabase } = auth

  // Fetch all users
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, is_admin, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  // Single-shot fetch of all completed bid transactions; aggregate in JS.
  // Replaces the previous per-user query (N+1) — one round-trip regardless
  // of user count.
  const { data: allTx, error: txError } = await supabase
    .from('transactions')
    .select('user_id, amount_eur')
    .eq('type', 'bid')
    .eq('status', 'completed')

  if (txError) {
    console.error('Failed to fetch transactions:', txError)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }

  const statsByUser = new Map<string, { count: number; total: number }>()
  for (const tx of allTx || []) {
    const prev = statsByUser.get(tx.user_id) || { count: 0, total: 0 }
    statsByUser.set(tx.user_id, {
      count: prev.count + 1,
      total: prev.total + (tx.amount_eur || 0),
    })
  }

  const usersWithStats = (users || []).map((user) => {
    const stats = statsByUser.get(user.id) || { count: 0, total: 0 }
    return {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      is_admin: user.is_admin,
      created_at: user.created_at,
      bid_count: stats.count,
      total_spent: stats.total,
    }
  })

  return NextResponse.json({ users: usersWithStats })
}
