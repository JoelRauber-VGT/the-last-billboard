'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useTranslations } from 'next-intl'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type SlotWithDetails = {
  id: string
  display_name: string
  image_url: string | null
  current_bid_eur: number
  status: 'active' | 'frozen' | 'removed'
  created_at: string
  owner_email: string
  history: Array<{
    id: string
    display_name: string
    bid_eur: number
    started_at: string
    ended_at: string | null
    owner_email: string
  }>
}

export default function AdminSlotsPage() {
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin.slots')

  const [slots, setSlots] = useState<SlotWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'removed'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [historySlot, setHistorySlot] = useState<SlotWithDetails | null>(null)

  useEffect(() => {
    loadSlots()
  }, [])

  async function loadSlots() {
    try {
      const res = await fetch('/api/admin/slots')
      const data = await res.json()
      setSlots(data.slots || [])
    } catch (error) {
      console.error('Failed to load slots:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleHide(slotId: string) {
    setActionLoading(slotId)
    try {
      const res = await fetch('/api/admin/slots/hide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
      })

      if (res.ok) {
        await loadSlots()
      }
    } catch (error) {
      console.error('Failed to hide slot:', error)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRestore(slotId: string) {
    setActionLoading(slotId)
    try {
      const res = await fetch('/api/admin/slots/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
      })

      if (res.ok) {
        await loadSlots()
      }
    } catch (error) {
      console.error('Failed to restore slot:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredSlots = statusFilter === 'all'
    ? slots
    : slots.filter(s => s.status === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading slots...</p>
      </div>
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
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'removed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('removed')}
          >
            Removed
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-6">
        <Card className={cn('transition-all duration-300 ease-out', historySlot ? 'min-w-0 flex-1' : 'w-full')}>
        <CardContent className="p-0">
          {filteredSlots.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Current Bid</TableHead>
                  <TableHead>Status</TableHead>
                  {!historySlot && <TableHead>Created</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSlots.map((slot) => (
                  <TableRow
                    key={slot.id}
                    data-active={historySlot?.id === slot.id ? 'true' : undefined}
                    className="data-[active=true]:bg-accent/40"
                  >
                    <TableCell>
                      {slot.image_url ? (
                        <img
                          src={slot.image_url}
                          alt={slot.display_name}
                          className="size-12 rounded object-cover"
                        />
                      ) : (
                        <div className="size-12 rounded bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{slot.display_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{slot.owner_email}</TableCell>
                    <TableCell className="font-mono">€{slot.current_bid_eur.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          slot.status === 'active'
                            ? 'success'
                            : slot.status === 'removed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {slot.status}
                      </Badge>
                    </TableCell>
                    {!historySlot && (
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(slot.created_at).toLocaleDateString(locale)}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant={historySlot?.id === slot.id ? 'default' : 'ghost'}
                          onClick={() =>
                            setHistorySlot((current) => (current?.id === slot.id ? null : slot))
                          }
                        >
                          {t('viewHistory')}
                        </Button>
                        {slot.status === 'active' ? (
                          <Dialog>
                            <DialogTrigger
                              render={
                                <Button size="sm" variant="destructive">
                                  {t('hide')}
                                </Button>
                              }
                            />
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t('confirmHide')}</DialogTitle>
                                <DialogDescription>
                                  This will hide the slot from the billboard.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleHide(slot.id)}
                                  disabled={actionLoading === slot.id}
                                >
                                  Confirm
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Dialog>
                            <DialogTrigger
                              render={
                                <Button size="sm" variant="outline">
                                  {t('restore')}
                                </Button>
                              }
                            />
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t('confirmRestore')}</DialogTitle>
                                <DialogDescription>
                                  This will restore the slot to the billboard.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  onClick={() => handleRestore(slot.id)}
                                  disabled={actionLoading === slot.id}
                                >
                                  Confirm
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No slots found
            </p>
          )}
        </CardContent>
        </Card>

        {historySlot && (
          <aside
            className="sticky top-8 w-[420px] shrink-0 animate-in slide-in-from-right-4 fade-in duration-300"
            aria-label="Slot history panel"
          >
            <Card className="overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Slot History
                  </p>
                  <h2 className="mt-0.5 truncate text-lg font-semibold text-foreground">
                    {historySlot.display_name}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {historySlot.owner_email}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="-mr-2 -mt-1 size-8 shrink-0"
                  onClick={() => setHistorySlot(null)}
                  aria-label="Close history"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 border-b border-border px-5 py-3 text-center">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Owners
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {new Set(historySlot.history.map((h) => h.owner_email)).size}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Bids
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {historySlot.history.length}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Volume
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                    €{historySlot.history.reduce((s, h) => s + h.bid_eur, 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="max-h-[calc(100vh-18rem)] overflow-y-auto">
                {historySlot.history.length > 0 ? (
                  <ol className="divide-y divide-border">
                    {historySlot.history.map((h) => (
                      <li key={h.id} className="px-5 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-medium text-foreground">
                            {h.display_name}
                          </p>
                          <p className="shrink-0 font-mono text-sm font-semibold text-foreground">
                            €{h.bid_eur.toFixed(2)}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {h.owner_email}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(h.started_at).toLocaleDateString(locale)}
                          {h.ended_at
                            ? ` – ${new Date(h.ended_at).toLocaleDateString(locale)}`
                            : ' – present'}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No history yet
                  </p>
                )}
              </div>
            </Card>
          </aside>
        )}
      </div>
    </div>
  )
}
