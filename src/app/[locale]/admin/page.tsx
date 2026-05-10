import { requireAdmin } from '@/lib/admin/auth'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getFreezeDate } from '@/lib/freeze/getFreezeDate'
import { Sparkline, TrendPill, LineChart, BarChart } from '@/components/admin/charts'
import {
  ImageIcon,
  AlertTriangleIcon,
  EuroIcon,
  TrendingUpIcon,
  ClockIcon,
  TrophyIcon,
  FlameIcon,
  ActivityIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const DAY_MS = 24 * 60 * 60 * 1000

type ProfileRef = { email: string | null; display_name: string | null } | null
type SlotRef = { display_name: string | null; image_url: string | null; current_bid_eur: number | null; status: string | null } | null

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { supabase } = await requireAdmin(locale)
  const t = await getTranslations({ locale, namespace: 'admin.overview' })

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)

  const [
    { count: activeSlotsCount },
    { count: openReportsCount },
    { data: allBidTx },
    { data: bidTx30d },
    { data: recentTransactions },
    { data: slotHistoryRows },
    { data: recentReports },
  ] = await Promise.all([
    supabase.from('slots').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase
      .from('transactions')
      .select('amount_eur, commission_eur, type, user_id, profiles(email, display_name)')
      .eq('status', 'completed')
      .eq('type', 'bid'),
    supabase
      .from('transactions')
      .select('amount_eur, commission_eur, created_at, type')
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('transactions')
      .select('id, created_at, amount_eur, type, profiles(email)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('slot_history')
      .select('slot_id, slots(display_name, image_url, current_bid_eur, status)'),
    supabase
      .from('reports')
      .select('id, reason, created_at, slots(display_name, image_url)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // ---- KPIs from 30d window
  const bids30d = (bidTx30d || []).filter((tx) => tx.type === 'bid')
  const refunds30d = (bidTx30d || []).filter((tx) => tx.type === 'refund')

  const sevenDaysAgoMs = now.getTime() - 7 * DAY_MS
  const fourteenDaysAgoMs = now.getTime() - 14 * DAY_MS

  const partition = <T extends { created_at: string; amount_eur: number; commission_eur: number | null }>(rows: T[]) => {
    const cur = { volume: 0, revenue: 0, count: 0 }
    const prev = { volume: 0, revenue: 0, count: 0 }
    for (const r of rows) {
      const ts = new Date(r.created_at).getTime()
      if (ts >= sevenDaysAgoMs) {
        cur.volume += r.amount_eur
        cur.revenue += r.commission_eur || 0
        cur.count += 1
      } else if (ts >= fourteenDaysAgoMs) {
        prev.volume += r.amount_eur
        prev.revenue += r.commission_eur || 0
        prev.count += 1
      }
    }
    return { cur, prev }
  }
  const { cur: cur7d, prev: prev7d } = partition(bids30d)

  const pct = (a: number, b: number): number | null => {
    if (b === 0) return a === 0 ? 0 : null
    return ((a - b) / b) * 100
  }
  const revenueDelta = pct(cur7d.revenue, prev7d.revenue)
  const volumeDelta = pct(cur7d.volume, prev7d.volume)
  const countDelta = pct(cur7d.count, prev7d.count)
  const avgBidCur = cur7d.count > 0 ? cur7d.volume / cur7d.count : 0
  const avgBidPrev = prev7d.count > 0 ? prev7d.volume / prev7d.count : 0
  const avgBidDelta = pct(avgBidCur, avgBidPrev)

  // ---- Daily buckets for last 30 days
  const dayBuckets: Array<{ date: Date; volume: number; revenue: number; count: number }> = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    dayBuckets.push({ date: d, volume: 0, revenue: 0, count: 0 })
  }
  for (const tx of bids30d) {
    const ts = new Date(tx.created_at)
    ts.setHours(0, 0, 0, 0)
    const idx = dayBuckets.findIndex((b) => b.date.getTime() === ts.getTime())
    if (idx >= 0) {
      dayBuckets[idx].volume += tx.amount_eur
      dayBuckets[idx].revenue += tx.commission_eur || 0
      dayBuckets[idx].count += 1
    }
  }
  const dayLabels = dayBuckets.map((b) => `${b.date.getDate()}.${b.date.getMonth() + 1}`)
  const dailyVolumes = dayBuckets.map((b) => b.volume)
  const dailyCounts = dayBuckets.map((b) => b.count)

  // last 7 days only — for sparklines
  const last7Volumes = dailyVolumes.slice(-7)
  const last7Revenues = dayBuckets.slice(-7).map((b) => b.revenue)
  const last7Counts = dailyCounts.slice(-7)

  // ---- Hour-of-day distribution from 30d bids
  const hourBuckets = new Array<number>(24).fill(0)
  for (const tx of bids30d) {
    const h = new Date(tx.created_at).getHours()
    hourBuckets[h] += 1
  }
  const hourLabels = Array.from({ length: 24 }, (_, h) => (h % 3 === 0 ? `${h}h` : ''))

  // ---- Top bidders (lifetime)
  type Bidder = { user_id: string; email: string; displayName: string; total: number; count: number }
  const bidderMap = new Map<string, Bidder>()
  for (const tx of allBidTx || []) {
    if (!tx.user_id) continue
    const profile = tx.profiles as unknown as ProfileRef
    const existing = bidderMap.get(tx.user_id)
    if (existing) {
      existing.total += tx.amount_eur
      existing.count += 1
    } else {
      bidderMap.set(tx.user_id, {
        user_id: tx.user_id,
        email: profile?.email ?? 'Unknown',
        displayName: profile?.display_name ?? profile?.email ?? 'Unknown',
        total: tx.amount_eur,
        count: 1,
      })
    }
  }
  const topBidders = [...bidderMap.values()].sort((a, b) => b.total - a.total).slice(0, 5)

  // ---- Most contested slots (by displacement count = slot_history rows)
  type Contested = { slot_id: string; displayName: string; imageUrl: string | null; currentBid: number; status: string; displacements: number }
  const contestedMap = new Map<string, Contested>()
  for (const row of slotHistoryRows || []) {
    if (!row.slot_id) continue
    const slot = row.slots as unknown as SlotRef
    const existing = contestedMap.get(row.slot_id)
    if (existing) {
      existing.displacements += 1
    } else {
      contestedMap.set(row.slot_id, {
        slot_id: row.slot_id,
        displayName: slot?.display_name ?? '—',
        imageUrl: slot?.image_url ?? null,
        currentBid: slot?.current_bid_eur ?? 0,
        status: slot?.status ?? 'unknown',
        displacements: 1,
      })
    }
  }
  const topContested = [...contestedMap.values()]
    .sort((a, b) => b.displacements - a.displacements)
    .slice(0, 5)

  // ---- Lifetime totals (kept for parity with previous dashboard)
  const lifetimeRevenue = (allBidTx || []).reduce((s, t) => s + (t.commission_eur || 0), 0)
  const lifetimeVolume = (allBidTx || []).reduce((s, t) => s + t.amount_eur, 0)
  const refundCount = refunds30d.length
  const refundRate = bids30d.length > 0 ? (refundCount / bids30d.length) * 100 : 0

  // ---- Time to Freeze with progress
  const freezeDate = await getFreezeDate()
  const timeToFreezeMs = freezeDate.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.floor(timeToFreezeMs / DAY_MS))
  const hoursLeft = Math.max(0, Math.floor((timeToFreezeMs % DAY_MS) / (60 * 60 * 1000)))
  // progress baseline: 90 days before freeze
  const baselineMs = 90 * DAY_MS
  const elapsed = Math.max(0, Math.min(baselineMs, baselineMs - timeToFreezeMs))
  const freezePct = (elapsed / baselineMs) * 100

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live overview · last 7 days vs prior 7 days · {bids30d.length} bids in 30d
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={`/${locale}/admin/slots`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="flex items-center gap-1.5">
                  <ImageIcon className="size-3.5" />
                  {t('activeSlots')}
                </CardDescription>
              </div>
              <CardTitle className="text-3xl tabular-nums">{activeSlotsCount || 0}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {(slotHistoryRows?.length || 0)} total displacements lifetime
              </p>
            </CardHeader>
          </Card>
        </Link>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1.5">
                <EuroIcon className="size-3.5" />
                Revenue · 7d
              </CardDescription>
              <TrendPill delta={revenueDelta} />
            </div>
            <div className="flex items-end justify-between gap-3">
              <CardTitle className="font-mono text-3xl tabular-nums">
                €{cur7d.revenue.toFixed(2)}
              </CardTitle>
              <Sparkline
                values={last7Revenues}
                className="text-emerald-500"
                width={80}
                height={28}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              €{lifetimeRevenue.toFixed(2)} lifetime
            </p>
          </CardHeader>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1.5">
                <TrendingUpIcon className="size-3.5" />
                Bid Volume · 7d
              </CardDescription>
              <TrendPill delta={volumeDelta} />
            </div>
            <div className="flex items-end justify-between gap-3">
              <CardTitle className="font-mono text-3xl tabular-nums">
                €{cur7d.volume.toFixed(2)}
              </CardTitle>
              <Sparkline
                values={last7Volumes}
                className="text-primary"
                width={80}
                height={28}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              €{lifetimeVolume.toFixed(2)} lifetime · {cur7d.count} bids
            </p>
          </CardHeader>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-1.5">
                <ActivityIcon className="size-3.5" />
                Avg Bid · 7d
              </CardDescription>
              <TrendPill delta={avgBidDelta} />
            </div>
            <div className="flex items-end justify-between gap-3">
              <CardTitle className="font-mono text-3xl tabular-nums">
                €{avgBidCur.toFixed(2)}
              </CardTitle>
              <Sparkline
                values={last7Counts}
                className="text-blue-500"
                width={80}
                height={28}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {cur7d.count} bids · {countDelta !== null ? `${countDelta > 0 ? '+' : ''}${countDelta.toFixed(0)}% vs prev` : '—'}
            </p>
          </CardHeader>
        </Card>

        <Link href={`/${locale}/admin/reports`}>
          <Card
            className={cn(
              'h-full transition-shadow hover:shadow-md',
              openReportsCount && openReportsCount > 0 && 'border-red-500/40 bg-red-500/5'
            )}
          >
            <CardHeader className="pb-3">
              <CardDescription
                className={cn(
                  'flex items-center gap-1.5',
                  openReportsCount && openReportsCount > 0 && 'text-red-600 dark:text-red-400'
                )}
              >
                <AlertTriangleIcon className="size-3.5" />
                {t('openReports')}
              </CardDescription>
              <CardTitle
                className={cn(
                  'text-3xl tabular-nums',
                  openReportsCount && openReportsCount > 0 && 'text-red-600 dark:text-red-400'
                )}
              >
                {openReportsCount || 0}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Refund rate 7d: {refundRate.toFixed(1)}%
              </p>
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/${locale}/admin/settings`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                {t('timeToFreeze')}
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {daysLeft}d <span className="text-base font-normal text-muted-foreground">{hoursLeft}h</span>
              </CardTitle>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, freezePct).toFixed(1)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Freezes {freezeDate.toISOString().slice(0, 10)}
              </p>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* 30-day chart */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Bid Activity · last 30 days</CardTitle>
              <CardDescription>Daily bid volume in EUR</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Volume</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LineChart
            values={dailyVolumes}
            labels={dayLabels}
            height={180}
            formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))}
          />
        </CardContent>
      </Card>

      {/* 3-column row */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {/* Top bidders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrophyIcon className="size-4 text-amber-500" />
              Top Bidders
            </CardTitle>
            <CardDescription>By lifetime spend</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {topBidders.length > 0 ? (
              <ol className="space-y-2.5">
                {topBidders.map((b, i) => (
                  <li key={b.user_id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        i === 0 && 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
                        i === 1 && 'bg-slate-400/20 text-slate-600 dark:text-slate-300',
                        i === 2 && 'bg-orange-700/20 text-orange-700 dark:text-orange-400',
                        i > 2 && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.count} bid{b.count === 1 ? '' : 's'} · {b.email}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      €{b.total.toFixed(0)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No bids yet</p>
            )}
          </CardContent>
        </Card>

        {/* Most contested slots */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlameIcon className="size-4 text-orange-500" />
              Most Contested Slots
            </CardTitle>
            <CardDescription>By displacement count</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {topContested.length > 0 ? (
              <ol className="space-y-2.5">
                {topContested.map((c) => (
                  <li key={c.slot_id} className="flex items-center gap-3">
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="size-9 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="size-9 shrink-0 rounded bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        €{c.currentBid.toFixed(2)} · {c.status}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                      <FlameIcon className="size-3" />
                      {c.displacements}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No history yet</p>
            )}
          </CardContent>
        </Card>

        {/* Bids by hour of day */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ActivityIcon className="size-4 text-blue-500" />
              Bid Pulse
            </CardTitle>
            <CardDescription>Bids by hour · 30d (local time)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {hourBuckets.some((v) => v > 0) ? (
              <>
                <BarChart values={hourBuckets} labels={hourLabels} height={120} className="text-blue-500" />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Peak: {hourBuckets.indexOf(Math.max(...hourBuckets))}:00
                  </span>
                  <span>{Math.max(...hourBuckets)} bids</span>
                </div>
              </>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No bids yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: open reports + recent transactions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Open Reports queue */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangleIcon className="size-4 text-red-500" />
                Open Reports
              </CardTitle>
              <Link
                href={`/${locale}/admin/reports`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentReports && recentReports.length > 0 ? (
              <ol className="space-y-2.5">
                {recentReports.map((r) => {
                  const slot = r.slots as unknown as SlotRef
                  return (
                    <li key={r.id} className="flex items-start gap-3">
                      {slot?.image_url ? (
                        <img
                          src={slot.image_url}
                          alt=""
                          className="size-9 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="size-9 shrink-0 rounded bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {slot?.display_name ?? '—'}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {r.reason}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString(locale)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No open reports
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t('recentTransactions')}</CardTitle>
                <CardDescription>Last 8 completed transactions</CardDescription>
              </div>
              <Link
                href={`/${locale}/admin/transactions`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </div>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString(locale, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
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
              <p className="py-4 text-center text-sm text-muted-foreground">No transactions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
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
