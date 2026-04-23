import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Protect route - redirect to login if not authenticated
  if (!user) {
    redirect(`/${locale}/login?redirect=/admin`)
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  // Return 404 if not admin (to hide route existence)
  if (!profile || !profile.is_admin) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: 'admin' })

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {t('title')}
          </h1>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <p className="text-lg text-zinc-600">
            {t('placeholder')}
          </p>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'admin' })

  return {
    title: t('title'),
  }
}
