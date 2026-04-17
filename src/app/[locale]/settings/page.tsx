import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { SettingsForm } from '@/components/settings/SettingsForm'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Protect route - redirect to login if not authenticated
  if (!user) {
    redirect(`/${locale}/login?redirect=/settings`)
  }

  const t = await getTranslations({ locale, namespace: 'settings' })

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, display_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-term-text">
            {t('title')}
          </h1>
          <p className="text-term-faint font-mono mt-2">
            {t('description')}
          </p>
        </div>

        <SettingsForm
          email={profile?.email || user.email || ''}
          displayName={profile?.display_name || ''}
        />
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    title: t('settings.title'),
    description: t('settings.description'),
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: t('settings.title'),
      description: t('settings.description'),
      url: `${baseUrl}/${locale}/settings`,
      siteName: 'The Last Billboard',
      locale: locale,
      type: 'website',
    },
  };
}
