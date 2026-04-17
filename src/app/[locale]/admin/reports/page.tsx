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
  report_count: number
}

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

  async function handleRemoveWithRefund(reportId: string, slotId: string) {
    setActionLoading(reportId)
    try {
      const res = await fetch('/api/admin/reports/remove-with-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, slotId }),
      })

      if (res.ok) {
        toast.success('Slot removed with refund')
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

  async function handleRemoveNoRefund(reportId: string, slotId: string) {
    setActionLoading(reportId)
    try {
      const res = await fetch('/api/admin/reports/remove-no-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, slotId }),
      })

      if (res.ok) {
        toast.success('Slot removed (no refund)')
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
        <p className="text-zinc-600">Loading reports...</p>
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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
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
                    <TableCell className="text-sm text-zinc-600">
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
                    <TableCell className="text-sm text-zinc-600">{report.reporter_email}</TableCell>
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
                            <Dialog>
                              <DialogTrigger>
                                <Button size="sm" variant="destructive">
                                  Remove
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{t('confirmRemove')}</DialogTitle>
                                  <DialogDescription>
                                    Choose how to handle this slot removal.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleRemoveWithRefund(report.id, report.slot_id)}
                                    disabled={actionLoading === report.id}
                                  >
                                    {t('removeWithRefund')}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleRemoveNoRefund(report.id, report.slot_id)}
                                    disabled={actionLoading === report.id}
                                  >
                                    {t('removeNoRefund')}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-12 text-center text-sm text-zinc-600">
              No reports found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
