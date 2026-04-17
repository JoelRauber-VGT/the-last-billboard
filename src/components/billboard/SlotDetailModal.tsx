'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { de, fr, es, enUS } from 'date-fns/locale'
import { useRouter } from '@/i18n/routing'
import { createBrowserClient } from '@/lib/supabase/client'
import type { Slot, SlotHistory } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReportDialog } from './ReportDialog'

interface SlotDetailModalProps {
  slot: Slot | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface HistoryEntry extends SlotHistory {
  displaced_by_name?: string
}

const localeMap = {
  en: enUS,
  de: de,
  fr: fr,
  es: es,
}

export function SlotDetailModal({ slot, open, onOpenChange }: SlotDetailModalProps) {
  const t = useTranslations('billboard.slotDetail')
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [locale, setLocale] = useState<keyof typeof localeMap>('en')
  const [reportDialogOpen, setReportDialogOpen] = useState(false)

  // Detect locale from URL or document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      const match = path.match(/^\/(en|de|fr|es)/)
      if (match) {
        setLocale(match[1] as keyof typeof localeMap)
      }
    }
  }, [])

  // Fetch slot history when modal opens
  useEffect(() => {
    if (slot && open) {
      fetchSlotHistory(slot.id)
    }
  }, [slot, open])

  const fetchSlotHistory = async (slotId: string) => {
    try {
      setLoading(true)
      const supabase = createBrowserClient()

      // Fetch history entries
      const { data, error } = await supabase
        .from('slot_history')
        .select('*')
        .eq('slot_id', slotId)
        .order('started_at', { ascending: false })

      if (error) throw error

      // Fetch displaced_by names for each entry
      const enrichedHistory: HistoryEntry[] = await Promise.all(
        (data || []).map(async (entry: SlotHistory) => {
          if (entry.displaced_by_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', entry.displaced_by_id)
              .single()

            const profile = profileData as { display_name: string | null } | null

            return {
              ...entry,
              displaced_by_name: profile?.display_name || 'Unknown',
            } as HistoryEntry
          }
          return entry as HistoryEntry
        })
      )

      setHistory(enrichedHistory)
    } catch (error) {
      console.error('Failed to fetch slot history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPp', { locale: localeMap[locale] })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const handleOutbid = () => {
    if (slot) {
      router.push(`/bid?outbid=${slot.id}`)
      onOpenChange(false)
    }
  }

  const handleReportSuccess = () => {
    // Optionally refresh slot history or show success message
    if (slot) {
      fetchSlotHistory(slot.id)
    }
  }

  if (!slot) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('ownedBy', { name: slot.display_name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Slot Display */}
          <div className="space-y-4">
            {slot.image_url && (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={slot.image_url}
                  alt={slot.display_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Brand Info */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{slot.display_name}</h3>
                {slot.link_url && (
                  <a
                    href={slot.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {slot.link_url}
                  </a>
                )}
              </div>
              {slot.brand_color && (
                <div
                  className="w-12 h-12 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: slot.brand_color }}
                />
              )}
            </div>

            {/* Current Bid */}
            <div className="bg-accent/10 p-6 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">{t('currentBid')}</p>
              <p className="text-4xl font-mono font-bold">
                {formatCurrency(slot.current_bid_eur)}
              </p>
            </div>
          </div>

          {/* History Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">{t('history')}</h4>

            {loading ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history available</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 bg-muted/30 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{entry.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(entry.bid_eur)}
                        </p>
                      </div>
                      {entry.image_url && (
                        <img
                          src={entry.image_url}
                          alt={entry.display_name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        {t('from')}: {formatDate(entry.started_at)}
                      </p>
                      {entry.ended_at ? (
                        <>
                          <p>
                            {t('to')}: {formatDate(entry.ended_at)}
                          </p>
                          {entry.displaced_by_name && (
                            <p>
                              {t('displacedBy', { name: entry.displaced_by_name })}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-green-600 font-semibold">
                          {t('currentOwner')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button onClick={handleOutbid} className="flex-1" size="lg">
              {t('outbid')}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              size="lg"
              onClick={() => setReportDialogOpen(true)}
            >
              {t('report')}
            </Button>
          </div>
        </div>

        {/* Report Dialog */}
        {slot && (
          <ReportDialog
            slotId={slot.id}
            open={reportDialogOpen}
            onOpenChange={setReportDialogOpen}
            onSuccess={handleReportSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
