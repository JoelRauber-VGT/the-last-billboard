import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'
import { getTranslations } from 'next-intl/server'

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const params = await searchParams
  const redirectTo = params.redirect || '/dashboard'

  // If already logged in, redirect to dashboard
  if (user) {
    redirect(redirectTo)
  }

  const t = await getTranslations('auth.login')

  return (
    <div className="flex min-h-screen items-center justify-center bg-term-bg px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a1a1a] border border-term-border-light p-0 shadow-2xl">
          {/* Terminal Header */}
          <div className="px-5 py-3 border-b border-term-faint">
            <span className="font-mono text-base text-term-accent">$ {t('command')}</span>
          </div>

          {/* Body */}
          <div className="px-5 py-6 bg-[#0f0f0f]">
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.login' })

  return {
    title: t('title'),
  }
}
