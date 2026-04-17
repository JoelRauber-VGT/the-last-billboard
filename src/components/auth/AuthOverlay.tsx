'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { createBrowserClient } from '@/lib/supabase/client'

interface AuthOverlayProps {
  isOpen: boolean
  onClose: () => void
  redirectTo?: string
}

export function AuthOverlay({ isOpen, onClose, redirectTo }: AuthOverlayProps) {
  const t = useTranslations('auth.login')
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, isLoading])

  const handleClose = () => {
    if (!isLoading) {
      setEmail('')
      setError(null)
      setIsSuccess(false)
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setError('invalid email format')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/${locale}/auth/callback${
            redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
          }`,
        },
      })

      if (signInError) {
        setError('error sending link')
        console.error('Magic link error:', signInError)
      } else {
        setIsSuccess(true)
      }
    } catch (err) {
      setError('unexpected error')
      console.error('Unexpected error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[460px] max-w-[calc(100vw-32px)] p-0 gap-0 bg-term-surface border-term-border-light"
        showCloseButton={false}
        aria-label="Authentication"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-term-faint">
          <span className="font-mono text-sm text-term-accent">$ auth</span>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="font-mono text-sm text-term-dim hover:text-term-muted transition-colors disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-term-accent focus:ring-offset-2 focus:ring-offset-term-surface"
            aria-label="Close dialog"
          >
            [esc]
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6 bg-term-bg font-mono text-base">
          {isSuccess ? (
            <>
              <p className="text-term-text mb-2">&gt; link sent to {email}</p>
              <p className="text-term-text mb-4">&gt; check your inbox</p>
              <p className="text-term-muted flex items-center gap-1">
                waiting<span className="animate-[blink_1s_step-end_infinite]">_</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-term-text mb-4">&gt; enter your email to receive a magic link</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  placeholder="your@email.com"
                  disabled={isLoading}
                  className="w-full bg-term-bg border border-term-border-light text-white px-3 py-2 font-mono text-base focus:outline-none focus:border-term-accent transition-colors disabled:opacity-50"
                  autoFocus
                />

                {error && (
                  <p className="text-term-danger">&gt; error: {error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full px-3 py-2 border border-term-border-light text-term-text hover:border-term-accent hover:text-term-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-term-accent focus:ring-offset-2 focus:ring-offset-term-bg"
                >
                  {isLoading ? '&gt; sending_' : '> [send link]'}
                </button>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
