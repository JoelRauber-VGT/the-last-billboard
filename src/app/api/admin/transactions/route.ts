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
  const { data: transactions, error, count } = await supabase
    .from('transactions')
    .select(
      `
      id,
      created_at,
      type,
      amount_eur,
      commission_eur,
      stripe_payment_intent_id,
      status,
      user:user_id(email)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions', code: 'fetch_failed' },
      { status: 500 },
    )
  }

  const formattedTransactions = transactions?.map(t => ({
    id: t.id,
    created_at: t.created_at,
    user_email: (t.user as unknown as { email: string } | null)?.email || 'Unknown',
    type: t.type,
    amount_eur: t.amount_eur,
    commission_eur: t.commission_eur,
    stripe_payment_intent_id: t.stripe_payment_intent_id,
    status: t.status,
  }))

  return NextResponse.json({
    transactions: formattedTransactions,
    total: count ?? 0,
    page,
    pageSize,
  })
}
