'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!reason) {
      setError(t('error'))
      return
    }

    const formData: ReportFormData = {
      reason: reason as ReportReason,
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slot_id: slotId,
          ...result.data,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(t('rateLimit'))
        } else {
          setError(data.error || t('error'))
        }
        return
      }

      // Success
      toast.success(t('success'))
      setReason('')
      setDetails('')
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Report submission error:', err)
      setError(t('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen)
      if (!newOpen) {
        // Reset form when closing
        setReason('')
        setDetails('')
        setError(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('button')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reason Select */}
          <div className="space-y-2">
            <Label htmlFor="reason">{t('reason.label')}</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as ReportReason)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder={t('reason.label')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inappropriate">
                  {t('reason.inappropriate')}
                </SelectItem>
                <SelectItem value="misleading">
                  {t('reason.misleading')}
                </SelectItem>
                <SelectItem value="copyright">
                  {t('reason.copyright')}
                </SelectItem>
                <SelectItem value="malware">
                  {t('reason.malware')}
                </SelectItem>
                <SelectItem value="spam">
                  {t('reason.spam')}
                </SelectItem>
                <SelectItem value="other">
                  {t('reason.other')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Details Textarea */}
          <div className="space-y-2">
            <Label htmlFor="details">{t('details.label')}</Label>
            <Textarea
              id="details"
              placeholder={t('details.placeholder')}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {t('details.maxLength')} ({details.length}/500)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !reason}>
              {isSubmitting ? 'Submitting...' : t('submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
