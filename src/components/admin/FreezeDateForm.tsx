'use client'

import { useState, useTransition, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateFreezeDate } from '@/app/actions/adminSettings'
import { toast } from 'sonner'

interface FreezeDateFormProps {
  initialIsoUtc: string
  initialInputValue: string
  labels: {
    field: string
    hint: string
    save: string
    saving: string
    success: string
    warningEarlier: string
    warningPast: string
  }
}

/**
 * The <input type="datetime-local"> value is interpreted as local
 * wall-clock time by the browser. We *want* admins to think in UTC
 * (matching how the freeze date is stored and displayed elsewhere),
 * so we treat the input as UTC by appending 'Z' before parsing.
 */
function inputValueToUtcIso(inputValue: string): string {
  // inputValue is "YYYY-MM-DDTHH:mm" — interpret as UTC
  return new Date(inputValue + ':00Z').toISOString()
}

export function FreezeDateForm({
  initialIsoUtc,
  initialInputValue,
  labels,
}: FreezeDateFormProps) {
  const [value, setValue] = useState(initialInputValue)
  const [savedIso, setSavedIso] = useState(initialIsoUtc)
  const [isPending, startTransition] = useTransition()

  const previewIso = useMemo(() => {
    try {
      return inputValueToUtcIso(value)
    } catch {
      return null
    }
  }, [value])

  // The form has minute precision; ignore sub-minute diffs so existing
  // saved values with stray seconds don't trigger spurious warnings.
  const floorMin = (ms: number) => Math.floor(ms / 60_000) * 60_000
  const previewMs = previewIso ? floorMin(new Date(previewIso).getTime()) : null
  const savedMs = floorMin(new Date(savedIso).getTime())
  const now = Date.now()

  const movingEarlier = previewMs !== null && previewMs < savedMs
  const movingToPast = previewMs !== null && previewMs <= now

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!previewIso) {
      toast.error('Invalid datetime')
      return
    }

    startTransition(async () => {
      const res = await updateFreezeDate({ freezeDateIso: previewIso })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setSavedIso(res.freezeDateIso)
      toast.success(labels.success)
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="freeze-date">{labels.field}</Label>
        <Input
          id="freeze-date"
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">{labels.hint}</p>
      </div>

      {movingToPast && (
        <p className="text-sm text-red-600 font-semibold">
          ⚠ {labels.warningPast}
        </p>
      )}
      {movingEarlier && !movingToPast && (
        <p className="text-sm text-amber-600">⚠ {labels.warningEarlier}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending || !previewIso}>
          {isPending ? labels.saving : labels.save}
        </Button>
        <p className="text-xs font-mono text-muted-foreground">
          {previewIso
            ? previewIso.slice(0, 16).replace('T', ' ') + ' UTC'
            : '—'}
        </p>
      </div>
    </form>
  )
}
