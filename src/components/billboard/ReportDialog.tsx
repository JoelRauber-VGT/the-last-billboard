'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { createBrowserClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/routing'

interface ReportDialogProps {
  slotId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const reportReasons = [
  'inappropriate',
  'misleading',
  'copyright',
  'malware',
  'spam',
  'other',
] as const

type ReportReason = (typeof reportReasons)[number]

const reportSchema = z.object({
  reason: z.enum(reportReasons),
  details: z.string().max(500).optional(),
})

type ReportFormData = z.infer<typeof reportSchema>

export function ReportDialog({
  slotId,
  open,
  onOpenChange,
  onSuccess,
}: ReportDialogProps) {
  const t = useTranslations('report')
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const handleOpenChange = (newOpen: boolean) => {
    if (isSubmitting) return
    onOpenChange(newOpen)
    if (!newOpen) {
      setReason('')
      setDetails('')
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!reason) {
      setError(t('error'))
      return
    }

    const formData: ReportFormData = {
      reason,
      details: details.trim() || undefined,
    }

    try {
      const result = reportSchema.safeParse(formData)
      if (!result.success) {
        setError(t('error'))
        return
      }

      setIsSubmitting(true)

      const response = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slotId, ...result.data }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) {
          setError(t('loginRequired'))
          setIsAuthenticated(false)
        } else if (response.status === 429) {
          setError(t('rateLimit'))
        } else {
          setError(data.error || t('error'))
        }
        return
      }

      toast.success(t('success'))
      setReason('')
      setDetails('')
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Report submission error:', err)
      setError(t('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const dialogClass =
    'sm:max-w-[460px] max-w-[calc(100vw-32px)] p-0 gap-0 bg-term-surface border-term-border-light'

  if (open && isAuthenticated === false) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={dialogClass}
          showCloseButton={false}
          aria-label={t('title')}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-term-faint">
            <span className="font-mono text-sm text-term-accent">
              $ report
            </span>
            <button
              onClick={() => handleOpenChange(false)}
              className="font-mono text-sm text-term-dim hover:text-term-muted transition-colors"
              aria-label="Close dialog"
            >
              [esc]
            </button>
          </div>
          <div className="px-5 py-6 bg-term-bg font-mono">
            <p className="text-term-text text-sm mb-4">
              &gt; {t('loginRequired')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="px-3 py-1.5 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent transition-colors"
              >
                [cancel]
              </button>
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs text-term-accent border border-term-accent hover:bg-term-accent/10 transition-colors"
              >
                [{t('loginCta')}]
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={dialogClass}
        showCloseButton={false}
        aria-label={t('title')}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-term-faint">
          <span className="font-mono text-sm text-term-accent">$ report</span>
          <button
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="font-mono text-sm text-term-dim hover:text-term-muted transition-colors disabled:opacity-30"
            aria-label="Close dialog"
          >
            [esc]
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-5 py-5 bg-term-bg font-mono space-y-5"
        >
          <p className="text-term-text text-sm">&gt; {t('button')}</p>

          {/* Reason Select */}
          <div className="space-y-2">
            <label
              htmlFor="report-reason"
              className="block text-xs text-term-accent tracking-wide"
            >
              [{t('reason.label')}]
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason | '')}
              disabled={isSubmitting}
              className="w-full bg-term-bg border border-term-border-light text-white px-3 py-2 font-mono text-sm focus:outline-none focus:border-term-accent transition-colors disabled:opacity-50"
            >
              <option value="" disabled>
                {t('reason.label')}
              </option>
              <option value="inappropriate">{t('reason.inappropriate')}</option>
              <option value="misleading">{t('reason.misleading')}</option>
              <option value="copyright">{t('reason.copyright')}</option>
              <option value="malware">{t('reason.malware')}</option>
              <option value="spam">{t('reason.spam')}</option>
              <option value="other">{t('reason.other')}</option>
            </select>
          </div>

          {/* Details Textarea */}
          <div className="space-y-2">
            <label
              htmlFor="report-details"
              className="block text-xs text-term-accent tracking-wide"
            >
              [{t('details.label')}]
            </label>
            <textarea
              id="report-details"
              placeholder={t('details.placeholder')}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={isSubmitting}
              className="w-full bg-term-bg border border-term-border-light text-white placeholder:text-term-dim px-3 py-2 font-mono text-sm focus:outline-none focus:border-term-accent transition-colors disabled:opacity-50 resize-none"
            />
            <p className="text-term-muted" style={{ fontSize: 12 }}>
              &gt; {t('details.maxLength')} ({details.length}/500)
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-term-danger">&gt; error: {error}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              [cancel]
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason}
              className="px-3 py-1.5 text-xs text-term-accent border border-term-accent hover:bg-term-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '[submitting...]' : `[${t('submit')}]`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
