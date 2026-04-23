'use client'

import React, { useEffect, useState, useMemo } from 'react'
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

type LocaleKey = keyof typeof localeMap

function truncateUrl(url: string, max = 50) {
  if (url.length <= max) return url
  return url.slice(0, max - 1) + '…'
}

function initialOf(name: string) {
  const ch = name.trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
}

function shortSlotId(id: string) {
  // DB stores UUID. Show the first segment — readable + unique enough.
  return id.split('-')[0].toUpperCase()
}

export function SlotDetailModal({ slot, open, onOpenChange }: SlotDetailModalProps) {
  const t = useTranslations('billboard.slotDetail')
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [locale, setLocale] = useState<LocaleKey>('en')
  const [reportDialogOpen, setReportDialogOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      const match = path.match(/^\/(en|de|fr|es)/)
      if (match) setLocale(match[1] as LocaleKey)
    }
  }, [])

  useEffect(() => {
    if (slot && open) fetchSlotHistory(slot.id)
  }, [slot, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSlotHistory = async (slotId: string) => {
    try {
      setLoading(true)
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('slot_history')
        .select('*')
        .eq('slot_id', slotId)
        .order('started_at', { ascending: false })
      if (error) throw error
      const enriched: HistoryEntry[] = await Promise.all(
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
      setHistory(enriched)
    } catch (err) {
      console.error('Failed to fetch slot history:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatShortDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, h:mm a', { locale: localeMap[locale] })
    } catch {
      return dateString
    }
  }

  const formatBidAmount = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleOutbid = () => {
    if (slot) {
      router.push(`/bid?outbid=${slot.id}`)
      onOpenChange(false)
    }
  }

  const handleReportSuccess = () => {
    if (slot) fetchSlotHistory(slot.id)
  }

  const formattedBid = useMemo(() => {
    if (!slot) return '0.00'
    return formatBidAmount(slot.current_bid_eur)
  }, [slot, locale]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!slot) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[440px] p-6 gap-5 rounded-sm border text-left"
        style={{
          background: '#0a0a0a',
          borderColor: 'rgba(255,255,255,0.08)',
          borderRadius: 4,
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        }}
      >
        <DialogHeader className="!mb-0 flex flex-row items-center justify-between gap-2 space-y-0">
          <DialogTitle
            className="font-normal tracking-wide"
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {`// SLOT_#${shortSlotId(slot.id)}`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('ownedBy', { name: slot.display_name })}
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 16,
              lineHeight: 1,
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            ×
          </button>
        </DialogHeader>

        {/* Image — original aspect ratio, contain, soft radial gradient bg */}
        {slot.image_url && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxHeight: 320,
              height: 240,
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.05)',
              background: 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%)',
              overflow: 'hidden',
            }}
          >
            <img
              src={slot.image_url}
              alt={slot.display_name}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                userSelect: 'none',
              }}
            />
          </div>
        )}

        {/* Owner block */}
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(96,165,250,0.15)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initialOf(slot.display_name)}
          </div>
          <div className="flex flex-col min-w-0">
            <div
              style={{
                color: '#ffffff',
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {slot.display_name}
            </div>
            {slot.link_url && (
              <a
                href={slot.link_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: 2,
                  color: '#60a5fa',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 12,
                  lineHeight: 1.3,
                  textDecoration: 'none',
                  display: 'inline-block',
                  width: 'fit-content',
                }}
                className="hover:underline"
              >
                [ visit ↗ ] {truncateUrl(slot.link_url, 50)}
              </a>
            )}
          </div>
        </div>

        {/* Current bid hero */}
        <div className="flex flex-col items-center" style={{ padding: '24px 0' }}>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            CURRENT_BID
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 4,
              position: 'relative',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 48,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1,
              }}
            >
              €
            </span>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 48,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1,
                position: 'relative',
              }}
            >
              {formattedBid}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -6,
                  height: 2,
                  background: '#60a5fa',
                }}
              />
            </span>
          </div>
        </div>

        {/* History timeline */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            {'// HISTORY'}
          </div>
          {loading ? (
            <p
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {t('loading')}
            </p>
          ) : history.length === 0 ? (
            <p
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              No history available
            </p>
          ) : (
            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                paddingRight: 2,
              }}
              className="history-scroll"
            >
              {history.slice(0, 5).map((entry, idx) => {
                const isCurrent = !entry.ended_at
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      alignItems: 'center',
                      columnGap: 10,
                      padding: '8px 0',
                      borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                      fontSize: 12,
                      lineHeight: 1.3,
                    }}
                  >
                    <span
                      style={{
                        color: isCurrent ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isCurrent ? '[$]' : '[→]'} €{formatBidAmount(entry.bid_eur)}
                    </span>
                    <span
                      style={{
                        color: isCurrent ? '#ffffff' : 'rgba(255,255,255,0.6)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.display_name}
                    </span>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {formatShortDate(entry.started_at)}
                      {isCurrent && (
                        <span style={{ color: '#22c55e', fontSize: 10 }}>◉ current</span>
                      )}
                      {!isCurrent && entry.displaced_by_name && (
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>(displaced)</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Action footer */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleOutbid}
            className="transition-all"
            style={{
              width: '100%',
              padding: '12px',
              background: '#60a5fa',
              color: '#0a0a0a',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7db4fb'
              e.currentTarget.style.boxShadow = '0 0 12px rgba(96,165,250,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#60a5fa'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            [ OUTBID THIS SLOT ]
          </button>
          <button
            type="button"
            onClick={() => setReportDialogOpen(true)}
            className="transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            report this slot
          </button>
        </div>

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
