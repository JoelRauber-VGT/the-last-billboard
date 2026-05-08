"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { createBrowserClient } from "@/lib/supabase/client"

interface LoginFormProps {
  redirectTo?: string
}

type Step = "email" | "code"

export function LoginForm({ redirectTo }: LoginFormProps) {
  const t = useTranslations("auth.login")
  const locale = useLocale()
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      setError(t("invalidEmail"))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/${locale}/auth/callback${
            redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""
          }`,
        },
      })

      if (signInError) {
        setError(t("errorSending"))
        console.error("OTP send error:", signInError)
      } else {
        setStep("code")
      }
    } catch (err) {
      setError(t("unexpectedError"))
      console.error("Unexpected error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault()

    const token = code.replace(/\s+/g, "")
    if (!/^\d{6}$/.test(token)) {
      setError(t("invalidCode"))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      })

      if (verifyError) {
        setError(t("invalidCode"))
        console.error("OTP verify error:", verifyError)
        setIsLoading(false)
        return
      }

      try {
        await fetch("/api/auth/ensure-admin", { method: "POST" })
      } catch (err) {
        console.error("ensure-admin call failed:", err)
      }

      const target = `/${locale}${redirectTo || "/dashboard"}`
      router.push(target)
      router.refresh()
    } catch (err) {
      setError(t("unexpectedError"))
      console.error("Unexpected error:", err)
      setIsLoading(false)
    }
  }

  function backToEmail() {
    setStep("email")
    setCode("")
    setError(null)
  }

  if (step === "code") {
    return (
      <div className="font-mono text-base">
        <p className="text-term-text mb-1">&gt; {t("linkSent", { email })}</p>
        <p className="text-term-muted mb-4">&gt; {t("checkInbox")}</p>

        <form onSubmit={onSubmitCode} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ""))
              setError(null)
            }}
            placeholder={t("codePlaceholder")}
            disabled={isLoading}
            className="w-full bg-term-bg border border-term-border-light text-white px-3 py-2 font-mono text-lg tracking-[0.4em] focus:outline-none focus:border-term-accent transition-colors disabled:opacity-50"
            autoFocus
          />

          {error && (
            <p className="text-term-danger">&gt; {t("errorPrefix")}: {error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full px-4 py-3 border border-term-border-light text-term-text hover:border-term-accent hover:text-term-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-term-accent focus:ring-offset-2 focus:ring-offset-term-bg"
          >
            {isLoading ? `> ${t("verifying")}_` : `> [${t("verify")}]`}
          </button>

          <button
            type="button"
            onClick={backToEmail}
            disabled={isLoading}
            className="w-full text-term-muted hover:text-term-accent transition-colors text-sm disabled:opacity-30 focus:outline-none"
          >
            &lt; {t("useDifferentEmail")}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="font-mono text-base">
      <p className="text-term-text mb-4">&gt; {t("prompt")}</p>

      <form onSubmit={onSubmitEmail} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError(null)
          }}
          placeholder={t("emailPlaceholder")}
          disabled={isLoading}
          className="w-full bg-term-bg border border-term-border-light text-white px-3 py-2 font-mono text-base focus:outline-none focus:border-term-accent transition-colors disabled:opacity-50"
          autoFocus
        />

        {error && (
          <p className="text-term-danger">&gt; {t("errorPrefix")}: {error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full px-4 py-3 border border-term-border-light text-term-text hover:border-term-accent hover:text-term-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-term-accent focus:ring-offset-2 focus:ring-offset-term-bg"
        >
          {isLoading ? `> ${t("sending")}_` : `> [${t("sendLink")}]`}
        </button>
      </form>
    </div>
  )
}
