import { requireAdmin } from '@/lib/admin/auth'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { config } from '@/lib/config'

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { supabase, user } = await requireAdmin(locale)
  const t = await getTranslations({ locale, namespace: 'admin.overview' })

  // Fetch dashboard stats
  const [
    { count: activeSlotsCount },
    { count: openReportsCount },
    { data: transactions },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase
      .from('slots')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('transactions')
      .select('amount_eur, commission_eur, type')
      .eq('status', 'completed'),
    supabase
      .from('transactions')
      .select('id, created_at, amount_eur, type, profiles(email)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Calculate totals
  const totalRevenue = transactions?.reduce((sum, t) => {
    return t.type === 'bid' ? sum + (t.commission_eur || 0) : sum
  }, 0) || 0

  const totalBidVolume = transactions?.reduce((sum, t) => {
    return t.type === 'bid' ? sum + t.amount_eur : sum
  }, 0) || 0

  // Calculate time to freeze
  const now = new Date()
  const freezeDate = config.billboardEndsAt
  const timeToFreeze = freezeDate.getTime() - now.getTime()
  const daysToFreeze = Math.max(0, Math.floor(timeToFreeze / (1000 * 60 * 60 * 24)))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          {t('title')}
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/${locale}/admin/slots`}>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardDescription>{t('activeSlots')}</CardDescription>
              <CardTitle className="text-3xl">{activeSlotsCount || 0}</CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/${locale}/admin/reports`}>
          <Card className={`transition-shadow hover:shadow-md ${openReportsCount && openReportsCount > 0 ? 'border-red-200 bg-red-50' : ''}`}>
            <CardHeader>
              <CardDescription className={openReportsCount && openReportsCount > 0 ? 'text-red-600' : ''}>
                {t('openReports')}
              </CardDescription>
              <CardTitle className={`text-3xl ${openReportsCount && openReportsCount > 0 ? 'text-red-600' : ''}`}>
                {openReportsCount || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardDescription>{t('totalRevenue')}</CardDescription>
            <CardTitle className="font-mono text-3xl">
              €{totalRevenue.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{t('totalBidVolume')}</CardDescription>
            <CardTitle className="text-3xl">
              €{totalBidVolume.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{t('timeToFreeze')}</CardDescription>
            <CardTitle className="text-3xl">
              {daysToFreeze} days
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentTransactions')}</CardTitle>
          <CardDescription>Last 10 completed transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions && recentTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm text-zinc-600">
                      {new Date(transaction.created_at).toLocaleString(locale)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(transaction.profiles as unknown as { email: string } | null)?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'bid' ? 'default' : 'secondary'}>
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      €{transaction.amount_eur.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-sm text-zinc-600">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'admin.overview' })

  return {
    title: t('title'),
  }
}
