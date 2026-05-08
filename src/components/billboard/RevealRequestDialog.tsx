'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createBrowserClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/routing'

interface RevealRequestDialogProps {
  slotId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent?: () => void
}

export function RevealRequestDialog({
  slotId,
  open,
  onOpenChange,
  onSent,
}: RevealRequestDialogProps) {
  const t = useTranslations('revealRequest')
  const tReport = useTranslations('report')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setIsAuthenticated(Boolean(data.user))
    })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setMessage('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reveal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slotId, message: message.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setError(t('alreadySent'))
        } else if (res.status === 429) {
          setError(t('rateLimit'))
        } else if (res.status === 401) {
          setError(t('loginRequired'))
        } else if (json?.error === 'self_target') {
          setError(t('selfTarget'))
        } else {
          setError(t('error'))
        }
        return
      }
      toast.success(t('success'))
      onSent?.()
      onOpenChange(false)
    } catch (err) {
      console.error('reveal request submit error', err)
      setError(t('error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[480px] p-7 gap-5 rounded-sm border text-left"
        style={{
          background: '#0a0a0a',
          borderColor: 'rgba(255,255,255,0.08)',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        }}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle
            className="font-normal tracking-wide"
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }}
          >
            {`// ${t('dialogTitle').toUpperCase().replace(/ /g, '_')}`}
          </DialogTitle>
          <DialogDescription style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5 }}>
            {t('intro')}
          </DialogDescription>
        </DialogHeader>

        {isAuthenticated === false ? (
          <div style={{ color: '#f87171', fontSize: 14, lineHeight: 1.5 }}>
            {t('loginRequired')}{' '}
            <Link href="/login" className="underline">
              {tReport('loginCta')}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="reveal-message"
                className="uppercase tracking-wide"
                style={{ color: '#60a5fa', fontSize: 13 }}
              >
                [{t('messageLabel')}]
              </label>
              <textarea
                id="reveal-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                placeholder={t('messagePlaceholder')}
                disabled={submitting}
                rows={4}
                className="w-full px-3 py-2 bg-term-surface border border-term-border-light text-white placeholder:text-term-dim focus:outline-none focus:border-term-accent disabled:opacity-50 resize-none"
                style={{ fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5 }}
              />
              <span className="text-term-muted self-end" style={{ fontSize: 12 }}>
                {message.length}/500
              </span>
            </div>

            {error && (
              <div
                className="px-3 py-2 border"
                style={{
                  color: '#f87171',
                  borderColor: 'rgba(248,113,113,0.4)',
                  background: 'rgba(248,113,113,0.08)',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="px-4 py-2 text-term-muted hover:text-white transition-colors"
                style={{ fontSize: 14 }}
              >
                [cancel]
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || isAuthenticated !== true}
                className="px-4 py-2 font-bold transition-colors"
                style={{
                  background: '#60a5fa',
                  color: '#0a0a0a',
                  opacity: submitting || isAuthenticated !== true ? 0.5 : 1,
                  fontSize: 14,
                }}
              >
                {submitting ? t('sending') : `[ ${t('send')} ]`}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
