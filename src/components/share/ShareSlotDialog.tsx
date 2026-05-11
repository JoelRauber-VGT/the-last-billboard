'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Check, Copy, Download, Link2, Mail, Share2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  buildShareTargets,
  type ShareContext,
  type ShareVariant,
} from '@/lib/share/buildShareLinks'

interface ShareSlotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: ShareVariant
  slot: {
    id: string
    display_name: string
    current_bid_eur: number
    image_url: string | null
  }
  outbidName?: string
}

const SOCIAL_SVG: Record<string, React.ReactNode> = {
  twitter: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21.5l-7.43 8.49L23 22h-6.875l-5.39-6.79L4.5 22H1.244l7.97-9.106L1 2h7.05l4.85 6.34L18.244 2Zm-2.412 18h1.93L7.27 4H5.225l10.607 16Z" />
    </svg>
  ),
  reddit: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M22 12.07c0-1.21-.98-2.2-2.2-2.2-.6 0-1.13.24-1.53.62-1.5-1.07-3.55-1.74-5.83-1.82l1-4.7 3.27.7c.04.83.72 1.49 1.55 1.49.86 0 1.55-.7 1.55-1.55 0-.86-.7-1.55-1.55-1.55-.6 0-1.12.34-1.38.84l-3.65-.78c-.18-.04-.36.07-.4.25l-1.1 5.2c-2.32.06-4.4.74-5.94 1.83-.4-.39-.94-.62-1.54-.62A2.2 2.2 0 0 0 2 12.07c0 .85.49 1.59 1.2 1.95-.04.24-.06.48-.06.72 0 3.66 4.27 6.62 9.53 6.62 5.27 0 9.53-2.96 9.53-6.62 0-.24-.02-.48-.06-.72.71-.36 1.2-1.1 1.2-1.95Zm-15.04 1.4a1.55 1.55 0 1 1 3.1 0 1.55 1.55 0 0 1-3.1 0Zm8.7 4.2c-1.06 1.06-3.1 1.14-3.7 1.14-.6 0-2.64-.08-3.7-1.14a.4.4 0 0 1 .56-.56c.67.67 2.1.91 3.14.91 1.04 0 2.47-.24 3.14-.91a.4.4 0 0 1 .56.56Zm-.27-2.65a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1Z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.26 2.37 4.26 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45C23.21 24 24 23.23 24 22.27V1.72C24 .77 23.21 0 22.22 0Z" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.51-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.45s1.04 2.84 1.19 3.04c.15.2 2.05 3.13 4.97 4.39.69.3 1.23.48 1.66.62.7.22 1.34.19 1.84.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.34ZM12.04 2C6.58 2 2.13 6.45 2.13 11.92c0 1.93.5 3.81 1.46 5.46L2 22l4.7-1.55a9.9 9.9 0 0 0 5.34 1.5h.01c5.46 0 9.91-4.45 9.91-9.92S17.5 2 12.04 2Z" />
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M9.78 18.65 10.06 14.42l7.74-6.98c.34-.31-.07-.46-.52-.19L7.74 13.3 3.6 12c-.89-.25-.9-.86.2-1.3l16.13-6.21c.74-.34 1.45.18 1.17 1.31l-2.75 12.95c-.19.91-.74 1.13-1.5.71L13.3 16.07l-1.99 1.93c-.23.23-.42.42-.83.42a.74.74 0 0 1-.7-.77Z" />
    </svg>
  ),
}

export function ShareSlotDialog({
  open,
  onOpenChange,
  variant,
  slot,
  outbidName,
}: ShareSlotDialogProps) {
  const t = useTranslations('share')
  const locale = useLocale()
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true)
    }
  }, [])

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])

  const ctx: ShareContext = useMemo(
    () => ({
      variant,
      displayName: slot.display_name,
      bidEur: slot.current_bid_eur,
      outbidName,
      slotId: slot.id,
      locale,
      baseUrl,
    }),
    [variant, slot, outbidName, locale, baseUrl]
  )

  const texts = useMemo(() => {
    const title = t(`${variant}.title`)
    const body = t(`${variant}.body`, {
      name: slot.display_name,
      bid: slot.current_bid_eur.toFixed(0),
      outbidName: outbidName ?? '',
    })
    const hashtags = t('hashtags').split(',').map((s) => s.trim()).filter(Boolean)
    return { title, body, hashtags }
  }, [t, variant, slot, outbidName])

  const targets = useMemo(() => {
    if (!baseUrl) return null
    return buildShareTargets(ctx, texts)
  }, [ctx, texts, baseUrl])

  const trackShare = (platform: string) => {
    // Fire-and-forget; never block the user's share action on telemetry.
    fetch(`/api/slots/${encodeURIComponent(slot.id)}/share-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'share', platform, variant }),
      keepalive: true,
    }).catch(() => {})
  }

  const handleCopy = async () => {
    if (!targets) return
    try {
      await navigator.clipboard.writeText(`${texts.body} ${targets.url}`)
      setCopied(true)
      toast.success(t('copied'))
      trackShare('copy')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('copyFailed'))
    }
  }

  const handleNativeShare = async () => {
    if (!targets) return
    try {
      await navigator.share({
        title: texts.title,
        text: texts.body,
        url: targets.url,
      })
      trackShare('native')
    } catch {
      // user cancelled or unsupported — silent
    }
  }

  if (!targets) {
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
          <DialogTitle className="sr-only">{t(`${variant}.title`)}</DialogTitle>
          <DialogDescription className="sr-only">{t('subtitle')}</DialogDescription>
          <div className="text-term-muted text-xs">…</div>
        </DialogContent>
      </Dialog>
    )
  }

  const buttons: { key: string; href: string; label: string }[] = [
    { key: 'twitter', href: targets.twitter, label: 'X / Twitter' },
    { key: 'reddit', href: targets.reddit, label: 'Reddit' },
    { key: 'facebook', href: targets.facebook, label: 'Facebook' },
    { key: 'linkedin', href: targets.linkedin, label: 'LinkedIn' },
    { key: 'whatsapp', href: targets.whatsapp, label: 'WhatsApp' },
    { key: 'telegram', href: targets.telegram, label: 'Telegram' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[520px] p-0 gap-0 rounded-sm border text-left overflow-hidden"
        style={{
          background: '#0a0a0a',
          borderColor: 'rgba(255,255,255,0.08)',
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-term-faint">
          <span className="text-term-accent text-sm flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5" />$ share_slot
          </span>
          <span className="text-term-dim text-xs">[{variant}]</span>
        </div>

        <DialogHeader className="px-5 pt-5 space-y-1">
          <DialogTitle
            className="font-normal tracking-wide text-base text-white"
          >
            &gt; {t(`${variant}.heading`)}
          </DialogTitle>
          <DialogDescription className="text-xs text-term-muted leading-snug">
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-4">
          {/* Preview card */}
          <div className="border border-term-border-light bg-term-surface/40 p-3 flex gap-3">
            <div className="shrink-0 w-16 h-16 overflow-hidden bg-term-bg">
              {slot.image_url ? (
                <img
                  src={slot.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-term-border-light" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-term-dim uppercase tracking-widest">
                {t('previewLabel')}
              </div>
              <div className="text-sm text-white truncate mt-0.5">
                {slot.display_name}
              </div>
              <div className="text-xs text-term-muted mt-0.5">
                €{slot.current_bid_eur.toFixed(0)}
                {variant === 'outbid' && outbidName && (
                  <> · {t('outbidShort', { name: outbidName })}</>
                )}
              </div>
            </div>
          </div>

          {/* Editable body */}
          <div className="mt-3">
            <label className="text-[10px] text-term-accent tracking-widest">
              [post_text]
            </label>
            <pre className="mt-1 text-[12px] text-term-text whitespace-pre-wrap leading-snug border border-term-border-light bg-term-surface/40 p-2.5 max-h-32 overflow-y-auto">
{texts.body}
            </pre>
          </div>
        </div>

        {/* Social buttons grid */}
        <div className="px-5 pt-4 grid grid-cols-3 gap-2">
          {buttons.map((b) => (
            <a
              key={b.key}
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackShare(b.key)}
              onAuxClick={(e) => {
                if (e.button === 1) trackShare(b.key)
              }}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-term-text border border-term-border-light hover:border-term-accent hover:text-term-accent transition-colors"
              aria-label={`share on ${b.label}`}
            >
              <span className="text-term-muted">{SOCIAL_SVG[b.key]}</span>
              <span className="truncate">{b.label}</span>
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 pt-3 pb-5 mt-3 border-t border-term-faint flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-term-accent border border-term-accent hover:bg-term-accent/10 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                {t('copied')}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                {t('copyText')}
              </>
            )}
          </button>

          <a
            href={targets.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            {t('openLink')}
          </a>

          <a
            href={targets.mailto}
            onClick={() => trackShare('email')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            {t('email')}
          </a>

          <a
            href={`/api/og/story?slot=${encodeURIComponent(slot.id)}&v=${variant}`}
            download={`thelastbillboard-${slot.id.slice(0, 8)}-story.png`}
            onClick={() => trackShare('copy')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent transition-colors"
            title={t('storyHelp')}
          >
            <Download className="w-3.5 h-3.5" />
            {t('downloadStory')}
          </a>

          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              {t('moreApps')}
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-term-muted hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {t('close')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
