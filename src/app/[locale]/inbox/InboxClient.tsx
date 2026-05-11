'use client'

import React, { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/routing'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'

export interface IncomingItem {
  id: string
  type:
    | 'reveal_request_received'
    | 'reveal_request_accepted'
    | 'reveal_request_declined'
    | 'slot_outbid'
    | 'system'
  created_at: string
  read_at: string | null
  payload: Record<string, unknown>
  requester_name: string | null
  related_reveal_request: {
    id: string
    slot_id: string
    target_owner_id: string
    requester_id: string
    message: string | null
    status: 'pending' | 'accepted' | 'declined' | 'expired'
    response_message: string | null
    created_at: string
    responded_at: string | null
  } | null
}

export interface OutgoingItem {
  id: string
  slot_id: string
  target_owner_id: string
  target_name: string | null
  message: string | null
  response_message: string | null
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
  responded_at: string | null
}

interface Props {
  incoming: IncomingItem[]
  outgoing: OutgoingItem[]
  locale: string
}

function formatWhen(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function InboxClient({ incoming, outgoing, locale }: Props) {
  const t = useTranslations('inbox')
  const tReq = useTranslations('revealRequest')
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [isPending, startTransition] = useTransition()
  const [responseDraft, setResponseDraft] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const unreadCount = incoming.filter((i) => !i.read_at).length

  // Supabase generated types narrow `.update()` to `never` on the un-typed
  // browser client. Cast through a minimal builder shape.
  type UpdateBuilder = {
    update: (values: { read_at: string }) => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>
      is: (col: string, val: null) => Promise<{ error: unknown }>
    }
  }

  async function markRead(notificationId: string) {
    const supabase = createBrowserClient()
    await (supabase.from('notifications') as unknown as UpdateBuilder)
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
    startTransition(() => router.refresh())
  }

  async function markAllRead() {
    const supabase = createBrowserClient()
    await (supabase.from('notifications') as unknown as UpdateBuilder)
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
    startTransition(() => router.refresh())
  }

  async function respond(
    revealId: string,
    notificationId: string,
    status: 'accepted' | 'declined'
  ) {
    setBusyId(revealId)
    try {
      const res = await fetch(`/api/reveal-requests/${revealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          response_message: responseDraft[revealId]?.trim() || null,
        }),
      })
      if (!res.ok) {
        toast.error(tReq('error'))
        return
      }
      toast.success(
        status === 'accepted' ? tReq('responseAccepted') : tReq('responseDeclined')
      )
      // mark the originating notification as read
      const supabase = createBrowserClient()
      await (supabase.from('notifications') as unknown as UpdateBuilder)
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
      startTransition(() => router.refresh())
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-term-border-light pb-2">
        <div className="flex gap-4 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className="transition-colors"
            style={{
              color: activeTab === 'incoming' ? '#ffffff' : 'rgba(255,255,255,0.4)',
              borderBottom:
                activeTab === 'incoming'
                  ? '2px solid #60a5fa'
                  : '2px solid transparent',
              paddingBottom: 4,
            }}
          >
            [{t('tabs.incoming')}]{' '}
            {unreadCount > 0 && (
              <span style={{ color: '#60a5fa' }}>· {unreadCount}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className="transition-colors"
            style={{
              color: activeTab === 'outgoing' ? '#ffffff' : 'rgba(255,255,255,0.4)',
              borderBottom:
                activeTab === 'outgoing'
                  ? '2px solid #60a5fa'
                  : '2px solid transparent',
              paddingBottom: 4,
            }}
          >
            [{t('tabs.outgoing')}]
          </button>
        </div>
        {activeTab === 'incoming' && unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={isPending}
            className="text-xs text-term-muted hover:text-white transition-colors"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'incoming' ? (
        incoming.length === 0 ? (
          <p className="text-sm text-term-muted">{t('empty.incoming')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {incoming.map((item) => {
              const unread = !item.read_at
              const reveal = item.related_reveal_request
              const isPendingReveal =
                item.type === 'reveal_request_received' && reveal?.status === 'pending'
              const isOutbid = item.type === 'slot_outbid'
              const requesterName =
                item.requester_name || t('anonymousFrom')

              if (isOutbid) {
                const slotId =
                  typeof item.payload.slot_id === 'string'
                    ? item.payload.slot_id
                    : null
                const newOwnerName =
                  typeof item.payload.new_owner_name === 'string'
                    ? item.payload.new_owner_name
                    : null
                const newOwnerIsAnon = item.payload.new_is_anonymous === true
                const newBid =
                  typeof item.payload.new_bid_eur === 'number'
                    ? item.payload.new_bid_eur
                    : Number.parseFloat(String(item.payload.new_bid_eur ?? ''))
                const prevBid =
                  typeof item.payload.previous_bid_eur === 'number'
                    ? item.payload.previous_bid_eur
                    : Number.parseFloat(
                        String(item.payload.previous_bid_eur ?? '')
                      )

                return (
                  <li
                    key={item.id}
                    className="border p-4 flex flex-col gap-3"
                    style={{
                      borderColor: unread
                        ? 'rgba(248,113,113,0.45)'
                        : 'rgba(255,255,255,0.08)',
                      background: unread ? 'rgba(248,113,113,0.05)' : 'transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-sm">
                          <span
                            className="text-white font-bold"
                            style={{ color: '#f87171' }}
                          >
                            {t('types.slot_outbid')}
                          </span>
                        </span>
                        <span className="text-[11px] text-term-muted">
                          {formatWhen(item.created_at, locale)}
                        </span>
                      </div>
                      {unread && (
                        <span
                          className="text-[10px] uppercase tracking-wider"
                          style={{ color: '#f87171' }}
                        >
                          ◉ {t('unread')}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-term-text">
                      {newOwnerIsAnon || !newOwnerName
                        ? t('outbid.bodyAnonymous', {
                            newBid: Number.isFinite(newBid)
                              ? newBid.toFixed(0)
                              : '—',
                            prevBid: Number.isFinite(prevBid)
                              ? prevBid.toFixed(0)
                              : '—',
                          })
                        : t('outbid.body', {
                            name: newOwnerName,
                            newBid: Number.isFinite(newBid)
                              ? newBid.toFixed(0)
                              : '—',
                            prevBid: Number.isFinite(prevBid)
                              ? prevBid.toFixed(0)
                              : '—',
                          })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {slotId && (
                        <Link
                          href={`/bid?outbid=${slotId}`}
                          className="px-3 py-1.5 text-xs font-bold transition-colors"
                          style={{ background: '#FF6B00', color: '#0a0a0a' }}
                        >
                          [{t('outbid.rebid')} →]
                        </Link>
                      )}
                      {slotId && (
                        <Link
                          href={`/?slot=${slotId}`}
                          className="px-3 py-1.5 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent transition-colors"
                        >
                          [{t('viewSlot')}]
                        </Link>
                      )}
                      {unread && (
                        <button
                          type="button"
                          onClick={() => markRead(item.id)}
                          className="ml-auto text-xs text-term-muted hover:text-white"
                        >
                          {t('outbid.acknowledge')}
                        </button>
                      )}
                    </div>
                  </li>
                )
              }

              return (
                <li
                  key={item.id}
                  className="border p-4 flex flex-col gap-3"
                  style={{
                    borderColor: unread
                      ? 'rgba(96,165,250,0.4)'
                      : 'rgba(255,255,255,0.08)',
                    background: unread ? 'rgba(96,165,250,0.04)' : 'transparent',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm">
                        <span className="text-white font-bold">{requesterName}</span>{' '}
                        <span className="text-term-muted">
                          {t(`types.${item.type}`)}
                        </span>
                      </span>
                      <span className="text-[11px] text-term-muted">
                        {formatWhen(item.created_at, locale)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {unread && (
                        <span
                          className="text-[10px] uppercase tracking-wider"
                          style={{ color: '#60a5fa' }}
                        >
                          ◉ {t('unread')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Original requester message */}
                  {item.type === 'reveal_request_received' && reveal && (
                    <div className="text-sm">
                      <div className="text-[11px] text-term-muted mb-1">
                        {tReq('messageFromRequester')}
                      </div>
                      <div className="text-term-text whitespace-pre-wrap">
                        {reveal.message || t('noMessage')}
                      </div>
                    </div>
                  )}

                  {/* For accepted/declined responses, show payload response_message */}
                  {(item.type === 'reveal_request_accepted' ||
                    item.type === 'reveal_request_declined') &&
                    typeof item.payload.response_message === 'string' &&
                    item.payload.response_message && (
                      <div className="text-sm text-term-text whitespace-pre-wrap">
                        “{item.payload.response_message}”
                      </div>
                    )}

                  {/* Slot link */}
                  {typeof item.payload.slot_id === 'string' && (
                    <Link
                      href="/"
                      className="text-xs text-term-accent hover:text-white transition-colors w-fit"
                    >
                      [{t('viewSlot')} →]
                    </Link>
                  )}

                  {/* Profile link if accepted */}
                  {item.type === 'reveal_request_accepted' &&
                    typeof item.payload.target_owner_id === 'string' && (
                      <Link
                        href={`/profile/${item.payload.target_owner_id}`}
                        className="text-xs text-term-accent hover:text-white transition-colors w-fit"
                      >
                        [{tReq('viewProfile')} →]
                      </Link>
                    )}

                  {/* Pending: show accept/decline */}
                  {isPendingReveal && reveal && (
                    <div className="flex flex-col gap-2 mt-1">
                      <textarea
                        value={responseDraft[reveal.id] || ''}
                        onChange={(e) =>
                          setResponseDraft((s) => ({
                            ...s,
                            [reveal.id]: e.target.value.slice(0, 500),
                          }))
                        }
                        placeholder={tReq('responsePlaceholder')}
                        rows={2}
                        className="w-full px-3 py-2 bg-term-surface border border-term-border-light text-white placeholder:text-term-dim focus:outline-none focus:border-term-accent text-sm resize-none"
                        style={{ fontFamily: 'inherit' }}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => respond(reveal.id, item.id, 'declined')}
                          disabled={busyId === reveal.id}
                          className="px-3 py-1.5 text-xs border border-term-border-light text-term-muted hover:text-white transition-colors"
                        >
                          [{tReq('decline')}]
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(reveal.id, item.id, 'accepted')}
                          disabled={busyId === reveal.id}
                          className="px-3 py-1.5 text-xs font-bold"
                          style={{ background: '#60a5fa', color: '#0a0a0a' }}
                        >
                          [{tReq('accept')}]
                        </button>
                      </div>
                    </div>
                  )}

                  {unread && !isPendingReveal && (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      className="text-xs text-term-muted hover:text-white self-end"
                    >
                      {t('markRead')}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )
      ) : outgoing.length === 0 ? (
        <p className="text-sm text-term-muted">{t('empty.outgoing')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {outgoing.map((o) => (
            <li
              key={o.id}
              className="border border-term-border-light p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm">
                    {t('to')}{' '}
                    <span className="text-white font-bold">
                      {o.target_name || t('anonymousFrom')}
                    </span>
                  </span>
                  <span className="text-[11px] text-term-muted">
                    {formatWhen(o.created_at, locale)}
                  </span>
                </div>
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{
                    color:
                      o.status === 'accepted'
                        ? '#22c55e'
                        : o.status === 'declined'
                          ? '#f87171'
                          : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {o.status === 'accepted'
                    ? `◉ ${tReq('outgoingAccepted')}`
                    : o.status === 'declined'
                      ? `× ${tReq('outgoingDeclined')}`
                      : `⌛ ${tReq('outgoingPending')}`}
                </span>
              </div>
              {o.message && (
                <div className="text-sm text-term-text whitespace-pre-wrap">
                  {o.message}
                </div>
              )}
              {o.response_message && (
                <div className="text-sm text-term-muted whitespace-pre-wrap border-l-2 border-term-border-light pl-3">
                  “{o.response_message}”
                </div>
              )}
              {o.status === 'accepted' && (
                <Link
                  href={`/profile/${o.target_owner_id}`}
                  className="text-xs text-term-accent hover:text-white transition-colors w-fit"
                >
                  [{tReq('viewProfile')} →]
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
