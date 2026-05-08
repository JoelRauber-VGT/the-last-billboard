"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { Save, Loader2 } from 'lucide-react'
import type { Database } from '@/types/database'

interface SettingsFormProps {
  email: string
  displayName: string | null
}

export function SettingsForm({ email, displayName }: SettingsFormProps) {
  const router = useRouter()
  const t = useTranslations('settings')
  const [newDisplayName, setNewDisplayName] = useState(displayName || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

      // Update profile — Supabase's generated type narrows `.update()`
      // to `never` for some chains. Cast the builder to sidestep that here.
      const { error: updateError } = await (supabase.from('profiles') as unknown as {
        update: (values: { display_name: string | null }) => {
          eq: (column: string, value: string) => Promise<{ error: unknown }>
        }
      })
        .update({ display_name: newDisplayName || null })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        setError(t('errors.updateFailed'))
        return
      }

      setSuccess(true)
      router.refresh()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError(t('errors.unexpected'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-term-border bg-term-bg/50">
      <CardHeader>
        <CardTitle className="font-mono text-term-text">{t('profile.title')}</CardTitle>
        <CardDescription className="font-mono text-term-faint">
          {t('profile.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="font-mono bg-term-border/30 text-term-faint border-term-border cursor-not-allowed"
            />
            <p className="text-xs text-term-faint font-mono">
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
            <Input
              id="displayName"
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder={t('profile.displayNamePlaceholder')}
              maxLength={50}
              className="font-mono bg-term-bg text-term-text border-term-border focus:border-term-accent"
            />
            <p className="text-xs text-term-faint font-mono">
              &gt; {t('profile.displayNameHelp')}
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
            disabled={isSaving}
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
  )
}
