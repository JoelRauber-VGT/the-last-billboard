import { checkAdminAuth } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/audit'
import { escapeCsvCell } from '@/lib/csv/escape'
import { NextResponse } from 'next/server'

// Hard server-side cap for CSV export. Admins are expected to receive the
// full dataset, but we still bound the query so a runaway table (millions of
// rows) cannot OOM the route. Bump if/when the table actually approaches it.
const EXPORT_HARD_LIMIT = 100_000

export async function GET() {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'forbidden' },
      { status: 404 }
    )
  }

  const { user, supabase } = auth

  // Fetch all transactions with user details (capped for safety).
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      created_at,
      type,
      amount_eur,
      commission_eur,
      stripe_payment_intent_id,
      status,
      user:user_id(email)
    `)
    .order('created_at', { ascending: false })
    .range(0, EXPORT_HARD_LIMIT - 1)

  if (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions', code: 'fetch_failed' },
      { status: 500 }
    )
  }

  // Generate CSV. Every cell is run through escapeCsvCell which guards
  // against CSV-Injection (formula-prefix sanitation) and RFC 4180 quoting.
  const headers = ['ID', 'Timestamp', 'User Email', 'Type', 'Amount (EUR)', 'Commission (EUR)', 'Stripe Payment Intent ID', 'Status']
  const rows = transactions?.map(t => [
    t.id,
    t.created_at,
    (t.user as unknown as { email: string } | null)?.email || 'Unknown',
    t.type,
    t.amount_eur.toString(),
    t.commission_eur.toString(),
    t.stripe_payment_intent_id || '',
    t.status,
  ]) || []

  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(',')),
  ].join('\r\n')

  // Log admin action
  await logAdminAction({
    adminId: user.id,
    action: 'export_transactions',
    targetType: 'transactions',
    details: { count: transactions?.length || 0 },
  })

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
