"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { createBrowserClient } from "@/lib/supabase/client"

interface LoginFormProps {
  redirectTo?: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const t = useTranslations("auth.login")
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setError(t('invalidEmail'))
      return
    }

    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/${locale}/auth/callback${
            redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""
          }`,
        },
      })

      if (signInError) {
        setError(t('errorSending'))
        console.error("Magic link error:", signInError)
      } else {
        setIsSuccess(true)
      }
    } catch (err) {
      setError(t('unexpectedError'))
      console.error("Unexpected error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="font-mono text-base text-term-text space-y-2">
        <p>&gt; {t('linkSent', { email })}</p>
        <p>&gt; {t('checkInbox')}</p>
        <p className="flex items-center gap-1 text-term-muted">
          {t('waiting')}<span className="animate-[blink_1s_step-end_infinite]">_</span>
        </p>
      </div>
    )
  }

  return (
    <div className="font-mono text-base">
      <p className="text-term-text mb-4">&gt; {t('prompt')}</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError(null)
          }}
          placeholder={t('emailPlaceholder')}
          disabled={isLoading}
          className="w-full bg-term-bg border border-term-border-light text-white px-3 py-2 font-mono text-base focus:outline-none focus:border-term-accent transition-colors disabled:opacity-50"
          autoFocus
        />

        {error && (
          <p className="text-term-danger">&gt; {t('errorPrefix')}: {error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full px-4 py-3 border border-term-border-light text-term-text hover:border-term-accent hover:text-term-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-term-accent focus:ring-offset-2 focus:ring-offset-term-bg"
        >
          {isLoading ? `> ${t('sending')}_` : `> [${t('sendLink')}]`}
        </button>
      </form>
    </div>
  )
}
