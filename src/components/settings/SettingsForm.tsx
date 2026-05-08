"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { Save, Loader2, Check, X, Download, Trash2, Upload } from 'lucide-react'
import { AccountDeleteDialog } from './AccountDeleteDialog'

interface SettingsFormProps {
  email: string
  displayName: string | null
  avatarUrl: string | null
}

function initialOf(name: string) {
  const ch = name.trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
}

type Availability =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'unchanged' }
  | { state: 'invalid'; reason: 'empty' | 'too_short' | 'too_long' | 'invalid_chars' }
  | { state: 'taken' }
  | { state: 'error' }

export function SettingsForm({ email, displayName, avatarUrl }: SettingsFormProps) {
  const router = useRouter()
  const t = useTranslations('settings')
  const [newDisplayName, setNewDisplayName] = useState(displayName || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' })
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [privacyError, setPrivacyError] = useState<string | null>(null)

  const [avatar, setAvatar] = useState<string | null>(avatarUrl)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setAvatarError(t('avatar.invalidType'))
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(t('avatar.tooLarge'))
      e.target.value = ''
      return
    }
    setIsUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/account/avatar', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setAvatarError(t('avatar.uploadFailed'))
        return
      }
      setAvatar(json.avatar_url ?? null)
      router.refresh()
    } catch {
      setAvatarError(t('avatar.uploadFailed'))
    } finally {
      setIsUploadingAvatar(false)
      e.target.value = ''
    }
  }

  async function handleAvatarRemove() {
    setIsUploadingAvatar(true)
    setAvatarError(null)
    try {
      const res = await fetch('/api/account/avatar', { method: 'DELETE' })
      if (!res.ok) {
        setAvatarError(t('avatar.removeFailed'))
        return
      }
      setAvatar(null)
      router.refresh()
    } catch {
      setAvatarError(t('avatar.removeFailed'))
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function handleExport() {
    setIsExporting(true)
    setPrivacyError(null)
    try {
      const res = await fetch('/api/account/export', { method: 'GET' })
      if (!res.ok) {
        setPrivacyError(t('privacy.exportFailed'))
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? 'last-billboard-export.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setPrivacyError(t('privacy.exportFailed'))
    } finally {
      setIsExporting(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setPrivacyError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        setPrivacyError(t('privacy.deleteFailed'))
        setDeleteDialogOpen(false)
        return
      }
      // Server already signed us out; force a hard refresh to the landing page.
      window.location.assign('/')
    } catch {
      setPrivacyError(t('privacy.deleteFailed'))
      setDeleteDialogOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const trimmed = newDisplayName.trim()
  const initialName = (displayName || '').trim()
  const isUnchanged = trimmed === initialName

  // Debounced availability check.
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => {
    if (isUnchanged) {
      setAvailability({ state: 'unchanged' })
      return
    }
    if (trimmed.length === 0) {
      setAvailability({ state: 'invalid', reason: 'empty' })
      return
    }

    setAvailability({ state: 'checking' })
    const handle = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch(
          `/api/profiles/check-display-name?name=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        )
        const json = await res.json()
        if (controller.signal.aborted) return
        if (!res.ok) {
          setAvailability({ state: 'error' })
          return
        }
        if (json.available) {
          setAvailability({ state: 'available' })
        } else if (json.reason) {
          setAvailability({ state: 'invalid', reason: json.reason })
        } else {
          setAvailability({ state: 'taken' })
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return
        setAvailability({ state: 'error' })
      }
    }, 350)

    return () => {
      clearTimeout(handle)
      abortRef.current?.abort()
    }
  }, [trimmed, isUnchanged])

  const canSave = useMemo(() => {
    if (isSaving) return false
    if (availability.state === 'unchanged') return false
    if (availability.state === 'available') return true
    return false
  }, [availability, isSaving])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError(t('errors.notAuthenticated'))
        return
      }

      // Re-check right before saving to close the TOCTOU window.
      const recheck = await fetch(
        `/api/profiles/check-display-name?name=${encodeURIComponent(trimmed)}`
      )
      const recheckJson = await recheck.json()
      if (!recheck.ok || !recheckJson.available) {
        setAvailability({ state: 'taken' })
        setError(t('availability.taken'))
        return
      }

      // Supabase's generated type narrows `.update()` to `never` on some chains;
      // cast the builder to sidestep that here.
      const { error: updateError } = await (supabase.from('profiles') as unknown as {
        update: (values: { display_name: string | null }) => {
          eq: (column: string, value: string) => Promise<{ error: unknown }>
        }
      })
        .update({ display_name: trimmed || null })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        setError(t('errors.updateFailed'))
        return
      }

      setSuccess(true)
      router.refresh()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError(t('errors.unexpected'))
    } finally {
      setIsSaving(false)
    }
  }

  const availabilityMessage = (() => {
    switch (availability.state) {
      case 'checking':
        return { text: t('availability.checking'), tone: 'muted' as const }
      case 'available':
        return { text: t('availability.available'), tone: 'success' as const }
      case 'taken':
        return { text: t('availability.taken'), tone: 'danger' as const }
      case 'invalid':
        return {
          text: t(`availability.invalid.${availability.reason}`),
          tone: 'danger' as const,
        }
      case 'error':
        return { text: t('availability.error'), tone: 'danger' as const }
      default:
        return null
    }
  })()

  const inputBorderClass = (() => {
    if (availability.state === 'available') return 'border-term-success focus:border-term-success'
    if (
      availability.state === 'taken' ||
      availability.state === 'invalid' ||
      availability.state === 'error'
    )
      return 'border-term-danger focus:border-term-danger'
    return 'border-term-border-light focus:border-term-accent'
  })()

  return (
    <div className="space-y-6">
    <Card className="border-term-border bg-term-bg/50">
      <CardHeader>
        <CardTitle className="font-mono text-term-text">{t('profile.title')}</CardTitle>
        <CardDescription className="font-mono text-term-muted">
          {t('profile.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="space-y-3">
            <p className="font-mono text-xs text-term-accent tracking-wide">
              [{t('avatar.label')}]
            </p>
            <div className="flex items-center gap-4">
              <div
                className="relative shrink-0 overflow-hidden flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: avatar
                    ? 'transparent'
                    : 'rgba(96,165,250,0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                }}
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt={t('avatar.label')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  initialOf(displayName || email)
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="font-mono text-xs px-3 py-2 text-term-accent border border-term-accent hover:bg-term-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        [{t('avatar.uploading')}]
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" />
                        [{avatar ? t('avatar.replace') : t('avatar.upload')}]
                      </>
                    )}
                  </button>
                  {avatar && !isUploadingAvatar && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      className="font-mono text-xs px-3 py-2 text-term-muted border border-term-border-light hover:text-term-danger hover:border-term-danger transition-colors inline-flex items-center gap-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      [{t('avatar.remove')}]
                    </button>
                  )}
                </div>
                <p className="text-xs text-term-muted font-mono">
                  &gt; {t('avatar.help')}
                </p>
                {avatarError && (
                  <p className="text-xs text-term-danger font-mono">
                    &gt; {avatarError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="font-mono text-xs text-term-accent tracking-wide"
            >
              [{t('profile.email')}]
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="font-mono bg-term-surface text-term-text border-term-border-light cursor-not-allowed disabled:opacity-100"
            />
            <p className="text-xs text-term-muted font-mono">
              &gt; {t('profile.emailHelp')}
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label
              htmlFor="displayName"
              className="font-mono text-xs text-term-accent tracking-wide"
            >
              [{t('profile.displayName')}]
            </Label>
            <div className="relative">
              <Input
                id="displayName"
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder={t('profile.displayNamePlaceholder')}
                maxLength={50}
                aria-invalid={
                  availability.state === 'taken' ||
                  availability.state === 'invalid' ||
                  availability.state === 'error'
                }
                aria-describedby="displayName-status"
                className={`font-mono bg-term-bg text-term-text pr-9 ${inputBorderClass}`}
              />
              <span
                aria-hidden
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center"
              >
                {availability.state === 'checking' && (
                  <Loader2 className="h-4 w-4 animate-spin text-term-muted" />
                )}
                {availability.state === 'available' && (
                  <Check className="h-4 w-4 text-term-success" />
                )}
                {(availability.state === 'taken' ||
                  availability.state === 'invalid' ||
                  availability.state === 'error') && (
                  <X className="h-4 w-4 text-term-danger" />
                )}
              </span>
            </div>
            <p
              id="displayName-status"
              role="status"
              aria-live="polite"
              className={`text-xs font-mono ${
                availabilityMessage?.tone === 'success'
                  ? 'text-term-success'
                  : availabilityMessage?.tone === 'danger'
                    ? 'text-term-danger'
                    : 'text-term-muted'
              }`}
            >
              &gt; {availabilityMessage?.text ?? t('profile.displayNameHelp')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm font-mono text-term-danger">
              &gt; error: {error}
            </p>
          )}

          {/* Success Message */}
          {success && (
            <p className="text-sm font-mono text-term-success">
              &gt; {t('success')}
            </p>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={!canSave}
            className="font-mono text-xs px-3 py-2 text-term-accent border border-term-accent hover:bg-term-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                [{t('saving')}]
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                [{t('save')}]
              </>
            )}
          </button>
        </form>
      </CardContent>
    </Card>

    <Card className="border-term-border bg-term-bg/50">
      <CardHeader>
        <CardTitle className="font-mono text-term-text">{t('privacy.title')}</CardTitle>
        <CardDescription className="font-mono text-term-muted">
          {t('privacy.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs text-term-accent tracking-wide">
            [{t('privacy.exportTitle')}]
          </p>
          <p className="text-xs text-term-muted font-mono">
            &gt; {t('privacy.exportHelp')}
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="font-mono text-xs px-3 py-2 text-term-accent border border-term-accent hover:bg-term-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                [{t('privacy.exporting')}]
              </>
            ) : (
              <>
                <Download className="h-3 w-3" />
                [{t('privacy.exportButton')}]
              </>
            )}
          </button>
        </div>

        <div className="space-y-2 pt-4 border-t border-term-border">
          <p className="font-mono text-xs text-term-danger tracking-wide">
            [{t('privacy.deleteTitle')}]
          </p>
          <p className="text-xs text-term-muted font-mono">
            &gt; {t('privacy.deleteHelp')}
          </p>
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
            className="font-mono text-xs px-3 py-2 text-term-danger border border-term-danger hover:bg-term-danger/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                [{t('privacy.deleting')}]
              </>
            ) : (
              <>
                <Trash2 className="h-3 w-3" />
                [{t('privacy.deleteButton')}]
              </>
            )}
          </button>
          <AccountDeleteDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={handleDelete}
            isDeleting={isDeleting}
          />
        </div>

        {privacyError && (
          <p className="text-sm font-mono text-term-danger">
            &gt; error: {privacyError}
          </p>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
