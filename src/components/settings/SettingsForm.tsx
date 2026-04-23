"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
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
            <Label htmlFor="email" className="font-mono text-term-text">
              {t('profile.email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="font-mono bg-term-border/30 text-term-faint border-term-border cursor-not-allowed"
            />
            <p className="text-xs text-term-faint font-mono">
              {t('profile.emailHelp')}
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="font-mono text-term-text">
              {t('profile.displayName')}
            </Label>
            <Input
              id="displayName"
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder={t('profile.displayNamePlaceholder')}
              maxLength={50}
              className="font-mono bg-term-bg text-term-text border-term-border focus:border-[#60a5fa]"
            />
            <p className="text-xs text-term-faint font-mono">
              {t('profile.displayNameHelp')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded border border-red-500/50 bg-red-500/10">
              <p className="text-sm text-red-400 font-mono">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 rounded border border-green-500/50 bg-green-500/10">
              <p className="text-sm text-green-400 font-mono">{t('success')}</p>
            </div>
          )}

          {/* Save Button */}
          <Button
            type="submit"
            disabled={isSaving}
            className="font-mono bg-[#60a5fa] hover:bg-[#3b82f6] text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('save')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
