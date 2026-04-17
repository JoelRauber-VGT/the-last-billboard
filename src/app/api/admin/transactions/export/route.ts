import { checkAdminAuth } from '@/lib/admin/auth'
import { logAdminAction } from '@/lib/admin/audit'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 })
  }

  const { user, supabase } = auth

  // Fetch all transactions with user details
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

  if (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }

  // Generate CSV
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
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')

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
