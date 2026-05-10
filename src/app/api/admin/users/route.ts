import { checkAdminAuth } from '@/lib/admin/auth'
import { parsePagination } from '@/lib/admin/pagination'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'forbidden' },
      { status: 404 },
    )
  }

  const { supabase } = auth
  const { page, pageSize, from, to } = parsePagination(request.nextUrl.searchParams)

  // Paginated fetch + exact total count for future Pagination-UI follow-up.
  const { data: users, error, count } = await supabase
    .from('profiles')
    .select('id, email, display_name, is_admin, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', code: 'fetch_failed' },
      { status: 500 },
    )
  }

  const userIds = (users || []).map((u) => u.id)

  // Single-shot fetch of completed bid transactions for the page's users
  // only; aggregate in JS. Replaces both the previous N+1 (one query per
  // user) and the previous "load all transactions ever" pattern.
  let allTx: Array<{ user_id: string; amount_eur: number }> | null = []
  if (userIds.length > 0) {
    const { data, error: txError } = await supabase
      .from('transactions')
      .select('user_id, amount_eur')
      .eq('type', 'bid')
      .eq('status', 'completed')
      .in('user_id', userIds)

    if (txError) {
      console.error('Failed to fetch transactions:', txError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions', code: 'fetch_failed' },
        { status: 500 },
      )
    }
    allTx = data
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

  return NextResponse.json({
    users: usersWithStats,
    total: count ?? 0,
    page,
    pageSize,
  })
}
