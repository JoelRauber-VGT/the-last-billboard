'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ExternalLinkIcon, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

type ReportWithDetails = {
  id: string
  slot_id: string
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
  reporter_email: string
  slot_display_name: string
  slot_image_url: string | null
  slot_bid_eur: number
  report_count: number
}

const DEFAULT_REFUND_PERCENT = 90

export default function AdminReportsPage() {
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin.reports')
  const tErrors = useTranslations('errors')

  const [reports, setReports] = useState<ReportWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved' | 'dismissed'>('open')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    try {
      const res = await fetch('/api/admin/reports')
      if (!res.ok) {
        throw new Error('Failed to fetch reports')
      }
      const data = await res.json()
      setReports(data.reports || [])
      setError(null)
    } catch (error) {
      console.error('Failed to load reports:', error)
      setError(tErrors('admin.loadFailed'))
      toast.error(tErrors('admin.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDismiss(reportId: string) {
    setActionLoading(reportId)
    try {
      const res = await fetch('/api/admin/reports/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })

      if (res.ok) {
        toast.success('Report dismissed successfully')
        await loadReports()
      } else {
        toast.error(tErrors('admin.actionFailed'))
      }
    } catch (error) {
      console.error('Failed to dismiss report:', error)
      toast.error(tErrors('admin.actionFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRemove(reportId: string, slotId: string, refundPercent: number) {
    setActionLoading(reportId)
    try {
      const res = await fetch('/api/admin/reports/remove-with-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, slotId, refundPercent }),
      })

      if (res.ok) {
        toast.success(
          refundPercent > 0
            ? `Slot removed (${refundPercent}% refund)`
            : 'Slot removed (no refund)'
        )
        await loadReports()
      } else {
        toast.error(tErrors('admin.actionFailed'))
      }
    } catch (error) {
      console.error('Failed to remove slot:', error)
      toast.error(tErrors('admin.actionFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const filteredReports = statusFilter === 'all'
    ? reports
    : reports.filter(r => r.status === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="size-8 text-destructive" />
            <div>
              <CardTitle className="text-destructive">
                {tErrors('admin.loadFailed')}
              </CardTitle>
              <CardDescription>
                {tErrors('generic')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={loadReports} variant="outline">
            {tErrors('retry')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'open' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('open')}
          >
            Open
          </Button>
          <Button
            variant={statusFilter === 'resolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved
          </Button>
          <Button
            variant={statusFilter === 'dismissed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('dismissed')}
          >
            Dismissed
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(report.created_at).toLocaleString(locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {report.slot_image_url && (
                          <img
                            src={report.slot_image_url}
                            alt={report.slot_display_name}
                            className="size-8 rounded object-cover"
                          />
                        )}
                        <span className="text-sm font-medium">{report.slot_display_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{report.reason}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{report.reporter_email}</TableCell>
                    <TableCell>
                      <Badge variant={report.report_count > 1 ? 'warning' : 'outline'}>
                        {report.report_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          report.status === 'open'
                            ? 'destructive'
                            : report.status === 'resolved'
                            ? 'success'
                            : 'secondary'
                        }
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/${locale}?slot=${report.slot_id}`, '_blank')}
                        >
                          <ExternalLinkIcon className="size-4" />
                        </Button>
                        {report.status === 'open' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDismiss(report.id)}
                              disabled={actionLoading === report.id}
                            >
                              {t('dismiss')}
                            </Button>
                            <RemoveSlotDialog
                              report={report}
                              loading={actionLoading === report.id}
                              onConfirm={(percent) =>
                                handleRemove(report.id, report.slot_id, percent)
                              }
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No reports found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RemoveSlotDialog({
  report,
  loading,
  onConfirm,
}: {
  report: ReportWithDetails
  loading: boolean
  onConfirm: (percent: number) => void
}) {
  const t = useTranslations('admin.reports')
  const [open, setOpen] = useState(false)
  const [percentInput, setPercentInput] = useState<string>(String(DEFAULT_REFUND_PERCENT))

  const parsed = Number.parseInt(percentInput, 10)
  const percent = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : DEFAULT_REFUND_PERCENT
  const valid = percentInput.trim() !== '' && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100

  const bid = report.slot_bid_eur
  const refundEur = Math.round(bid * (percent / 100) * 100) / 100
  const feeEur = Math.round((bid - refundEur) * 100) / 100

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setPercentInput(String(DEFAULT_REFUND_PERCENT))
  }

  function handleConfirm() {
    if (!valid) return
    onConfirm(percent)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" variant="destructive">
            {t('remove')}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirmRemove')}</DialogTitle>
          <DialogDescription>{t('removeDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium" htmlFor="refund-percent">
              {t('refundPercentLabel')}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="refund-percent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={percentInput}
                onChange={(e) => setPercentInput(e.target.value)}
                className="w-24 rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {t('refundPercentHint')}
              </span>
            </div>
          </div>

          <div className="rounded border border-border bg-muted/30 p-3 text-sm">
            <div className="mb-1 flex justify-between">
              <span className="text-muted-foreground">{t('originalBid')}</span>
              <span className="font-mono">€{bid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('refundLabel')} ({percent}%)
              </span>
              <span className="font-mono">€{refundEur.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('feeLabel')} ({100 - percent}%)
              </span>
              <span className="font-mono">€{feeEur.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !valid}
          >
            {percent > 0
              ? t('confirmRemoveWithRefund', { percent })
              : t('confirmRemoveNoRefund')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
