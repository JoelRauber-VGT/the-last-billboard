'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useTranslations } from 'next-intl'

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

      <Card>
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
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSlots.map((slot) => (
                  <TableRow key={slot.id}>
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
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(slot.created_at).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog>
                          <DialogTrigger>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setHistorySlot(slot)}
                            >
                              {t('viewHistory')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Slot History: {slot.display_name}</DialogTitle>
                              <DialogDescription>
                                Complete history of this slot
                              </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-96 overflow-y-auto">
                              {slot.history.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Owner</TableHead>
                                      <TableHead>Display Name</TableHead>
                                      <TableHead>Bid</TableHead>
                                      <TableHead>Period</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {slot.history.map((h) => (
                                      <TableRow key={h.id}>
                                        <TableCell className="text-sm">{h.owner_email}</TableCell>
                                        <TableCell className="text-sm">{h.display_name}</TableCell>
                                        <TableCell className="font-mono text-sm">€{h.bid_eur.toFixed(2)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                          {new Date(h.started_at).toLocaleDateString(locale)}
                                          {h.ended_at && ` - ${new Date(h.ended_at).toLocaleDateString(locale)}`}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="py-4 text-center text-sm text-muted-foreground">No history yet</p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        {slot.status === 'active' ? (
                          <Dialog>
                            <DialogTrigger>
                              <Button size="sm" variant="destructive">
                                {t('hide')}
                              </Button>
                            </DialogTrigger>
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
                            <DialogTrigger>
                              <Button size="sm" variant="outline">
                                {t('restore')}
                              </Button>
                            </DialogTrigger>
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
    </div>
  )
}
