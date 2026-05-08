'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { de, fr, es, enUS } from 'date-fns/locale'
import { useRouter, Link } from '@/i18n/routing'
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
import { RevealRequestDialog } from './RevealRequestDialog'

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
  const [revealDialogOpen, setRevealDialogOpen] = useState(false)
  const [authedUserId, setAuthedUserId] = useState<string | null>(null)
  const [ownerProfile, setOwnerProfile] = useState<{
    display_name: string | null
    avatar_url: string | null
  } | null>(null)
  const [revealStatus, setRevealStatus] = useState<
    'none' | 'pending' | 'accepted' | 'declined'
  >('none')

  useEffect(() => {
    if (!open || !slot) return
    let cancelled = false
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return
      const uid = data.user?.id ?? null
      setAuthedUserId(uid)
      if (uid && slot.is_anonymous) {
        const { data: rr } = await supabase
          .from('reveal_requests')
          .select('status')
          .eq('slot_id', slot.id)
          .eq('requester_id', uid)
          .maybeSingle()
        if (!cancelled) {
          const status = (rr as { status?: string } | null)?.status
          if (status === 'accepted') setRevealStatus('accepted')
          else if (status === 'declined') setRevealStatus('declined')
          else if (status === 'pending') setRevealStatus('pending')
          else setRevealStatus('none')
        }
      } else {
        setRevealStatus('none')
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, slot])

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

  // Pull the *current* owner profile so name + avatar in the modal always
  // reflect the user's settings (not whatever was stored on the slot row).
  useEffect(() => {
    if (!open || !slot || slot.is_anonymous || !slot.current_owner_id) {
      setOwnerProfile(null)
      return
    }
    let cancelled = false
    const supabase = createBrowserClient()
    supabase
      .from('public_profiles')
      .select('display_name, avatar_url')
      .eq('id', slot.current_owner_id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setOwnerProfile(
          (data as { display_name: string | null; avatar_url: string | null } | null) ?? null
        )
      })
    return () => {
      cancelled = true
    }
  }, [open, slot])

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
              .from('public_profiles')
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
        className="w-full max-w-[520px] p-7 gap-6 rounded-sm border text-left"
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
              fontSize: 16,
              color: 'rgba(255,255,255,0.6)',
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
              height: 280,
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

        {/* Owner block — name + avatar are sourced from the owner's current
            profile so they stay in sync if the user updates their settings. */}
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              overflow: 'hidden',
              background: slot.is_anonymous
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(96,165,250,0.15)',
              color: slot.is_anonymous ? 'rgba(255,255,255,0.55)' : '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 16,
              fontWeight: 600,
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {slot.is_anonymous ? (
              '?'
            ) : ownerProfile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ownerProfile.avatar_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initialOf(ownerProfile?.display_name || slot.display_name)
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div
              style={{
                color: '#ffffff',
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 17,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {slot.is_anonymous
                ? t('anonymous')
                : ownerProfile?.display_name || slot.display_name}
            </div>
            {slot.is_anonymous ? (
              <span
                style={{
                  marginTop: 4,
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              >
                {t('anonymousNotice')}
              </span>
            ) : (
              slot.current_owner_id && (
                <Link
                  href={`/profile/${slot.current_owner_id}`}
                  style={{
                    marginTop: 4,
                    color: '#60a5fa',
                    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                    fontSize: 15,
                    lineHeight: 1.4,
                    textDecoration: 'none',
                    display: 'inline-block',
                    width: 'fit-content',
                    cursor: 'pointer',
                  }}
                  className="hover:underline"
                >
                  [ {t('viewProfile')} → ]
                </Link>
              )
            )}
            {slot.link_url && (
              <a
                href={slot.link_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: 4,
                  color: '#60a5fa',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 15,
                  lineHeight: 1.4,
                  textDecoration: 'none',
                  display: 'inline-block',
                  width: 'fit-content',
                  cursor: 'pointer',
                }}
                className="hover:underline"
              >
                [ visit ↗ ] {truncateUrl(slot.link_url, 50)}
              </a>
            )}
          </div>
        </div>

        {/* Reveal CTA / status — anonymous slot only.
            Owner sees a self-marker; everyone else (incl. logged-out) sees the
            ask-for-reveal button. Logged-out users get redirected to login. */}
        {slot.is_anonymous && authedUserId && authedUserId === slot.current_owner_id && (
          <div
            className="-mt-2"
            style={{
              color: 'rgba(255,255,255,0.65)',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '10px 12px',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            ◉ {t('selfNotice')}
          </div>
        )}
        {slot.is_anonymous && authedUserId !== slot.current_owner_id && (
          <div className="flex flex-col items-stretch gap-2 -mt-2">
            {authedUserId && revealStatus === 'accepted' ? (
              <div
                style={{
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.4)',
                  background: 'rgba(34,197,94,0.08)',
                  padding: '10px 12px',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 14,
                }}
              >
                ◉ {t('revealAccepted')}
                {slot.current_owner_id && (
                  <>
                    {' · '}
                    <Link
                      href={`/profile/${slot.current_owner_id}`}
                      className="underline"
                    >
                      {t('viewProfile')}
                    </Link>
                  </>
                )}
              </div>
            ) : authedUserId && revealStatus === 'pending' ? (
              <div
                className="text-center"
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '10px 12px',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 14,
                }}
              >
                ⌛ {t('revealPending')}
              </div>
            ) : authedUserId && revealStatus === 'declined' ? null : (
              <button
                type="button"
                onClick={() => {
                  if (authedUserId) {
                    setRevealDialogOpen(true)
                  } else {
                    const next =
                      typeof window !== 'undefined'
                        ? window.location.pathname + window.location.search
                        : '/'
                    router.push(`/login?next=${encodeURIComponent(next)}`)
                    onOpenChange(false)
                  }
                }}
                className="transition-colors"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(96,165,250,0.4)',
                  color: '#60a5fa',
                  padding: '10px 14px',
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(96,165,250,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                [ ? {t('askForReveal')} ]
              </button>
            )}
          </div>
        )}

        {/* Current bid hero */}
        <div className="flex flex-col items-center" style={{ padding: '24px 0' }}>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 12,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.5)',
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
                fontSize: 56,
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
                fontSize: 56,
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
              fontSize: 13,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}
          >
            {'// HISTORY'}
          </div>
          {loading ? (
            <p
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 14,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              {t('loading')}
            </p>
          ) : history.length === 0 ? (
            <p
              style={{
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                fontSize: 14,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              No history available
            </p>
          ) : (
            <div
              style={{
                maxHeight: 200,
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
                      padding: '10px 0',
                      borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                      fontSize: 14,
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      style={{
                        color: isCurrent ? '#ffffff' : 'rgba(255,255,255,0.5)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isCurrent ? '[$]' : '[→]'} €{formatBidAmount(entry.bid_eur)}
                    </span>
                    <span
                      style={{
                        color: isCurrent ? '#ffffff' : 'rgba(255,255,255,0.7)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.is_anonymous ? t('anonymous') : entry.display_name}
                    </span>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.5)',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                      }}
                    >
                      {formatShortDate(entry.started_at)}
                      {isCurrent && (
                        <span style={{ color: '#22c55e', fontSize: 13 }}>◉ current</span>
                      )}
                      {!isCurrent && entry.displaced_by_name && (
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>(displaced)</span>
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
              padding: '14px',
              background: '#60a5fa',
              color: '#0a0a0a',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              letterSpacing: '0.04em',
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
              fontSize: 14,
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              padding: '8px 12px',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              textDecorationColor: 'rgba(255,255,255,0.25)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
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
        {slot && (
          <RevealRequestDialog
            slotId={slot.id}
            open={revealDialogOpen}
            onOpenChange={setRevealDialogOpen}
            onSent={() => setRevealStatus('pending')}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
