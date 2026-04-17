import { checkAdminAuth } from '@/lib/admin/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 })
  }

  const { supabase } = auth

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

  return NextResponse.json({ transactions: formattedTransactions })
}
