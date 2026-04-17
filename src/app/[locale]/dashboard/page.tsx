import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Package } from 'lucide-react'
import { Link } from '@/i18n/routing'
import type { Slot } from '@/types/database'

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Protect route - redirect to login if not authenticated
  if (!user) {
    redirect(`/${locale}/login?redirect=/dashboard`)
  }

  const t = await getTranslations({ locale, namespace: 'dashboard' })
  const tReport = await getTranslations({ locale, namespace: 'report' })
  const tErrors = await getTranslations({ locale, namespace: 'errors' })

  // Fetch user's slots
  const { data: userSlots, error: fetchError } = await supabase
    .from('slots')
    .select('*')
    .eq('current_owner_id', user.id)
    .order('updated_at', { ascending: false })

  // Handle error state
  if (fetchError) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:py-12">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t('title')}
            </h1>
          </div>
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">
                {tErrors('admin.loadFailed')}
              </CardTitle>
              <CardDescription>
                {tErrors('generic')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard">
                <Button variant="outline">
                  {tErrors('retry')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const slots = (userSlots || []) as Slot[]
  const removedSlots = slots.filter(slot => slot.status === 'removed')
  const activeSlots = slots.filter(slot => slot.status !== 'removed')

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:py-12">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t('title')}
          </h1>
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* Removed Slots Warning */}
          {removedSlots.length > 0 && (
            <div className="space-y-4">
              {removedSlots.map(slot => (
                <Card key={slot.id} className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-900 text-lg md:text-xl">
                      {tReport('removed.title')}
                    </CardTitle>
                    <CardDescription className="text-red-700">
                      {slot.display_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-800 mb-4">
                      {tReport('removed.message')}
                    </p>
                    <a href={`mailto:support@thelastbillboard.com?subject=Report Review for Slot ${slot.id}`}>
                      <Button variant="outline" size="sm">
                        {tReport('removed.contactSupport')}
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state or Active slots */}
          {slots.length === 0 ? (
            <Card>
              <EmptyState
                icon={Package}
                title={t('empty')}
                message={t('emptyAction')}
                action={{
                  label: t('placeBid'),
                  href: '/bid',
                }}
              />
            </Card>
          ) : activeSlots.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSlots.map(slot => (
                <Card key={slot.id}>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">{slot.display_name}</CardTitle>
                    <CardDescription>
                      Current bid: <span className="font-mono">€{slot.current_bid_eur.toFixed(2)}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {slot.image_url && (
                      <img
                        src={slot.image_url}
                        alt={slot.display_name}
                        className="w-full max-w-xs h-auto object-cover rounded border"
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Table structure ready for Phase 2 */}
        {/*
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-zinc-900">Slot</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-zinc-900">Bid Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-zinc-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-zinc-900">Date</th>
              </tr>
            </thead>
            <tbody>
              {/* Bid rows will go here *}
            </tbody>
          </table>
        </div>
        */}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    title: t('dashboard.title'),
    description: t('dashboard.description'),
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: t('dashboard.title'),
      description: t('dashboard.description'),
      url: `${baseUrl}/${locale}/dashboard`,
      siteName: 'The Last Billboard',
      locale: locale,
      type: 'website',
    },
  };
}
