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

  // Fetch transaction stats for each user
  const usersWithStats = await Promise.all(
    (users || []).map(async (user) => {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount_eur, type')
        .eq('user_id', user.id)
        .eq('type', 'bid')
        .eq('status', 'completed')

      const bidCount = transactions?.length || 0
      const totalSpent = transactions?.reduce((sum, t) => sum + t.amount_eur, 0) || 0

      return {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_admin: user.is_admin,
        created_at: user.created_at,
        bid_count: bidCount,
        total_spent: totalSpent,
      }
    })
  )

  return NextResponse.json({ users: usersWithStats })
}
