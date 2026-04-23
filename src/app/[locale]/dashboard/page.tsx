import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import type { Slot, SlotHistory } from '@/types/database'

type OutbidEntry = SlotHistory & {
  slots: Pick<Slot, 'id' | 'current_bid_eur' | 'status'> | null
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login?redirect=/dashboard`)
  }

  const t = await getTranslations({ locale, namespace: 'dashboard' })

  const [{ data: userSlots }, { data: outbidRaw }] = await Promise.all([
    supabase
      .from('slots')
      .select('*')
      .eq('current_owner_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('slot_history')
      .select('*, slots(id, current_bid_eur, status)')
      .eq('owner_id', user.id)
      .not('ended_at', 'is', null)
      .not('displaced_by_id', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(10),
  ])

  const slots = (userSlots || []) as Slot[]
  const outbid = (outbidRaw || []) as OutbidEntry[]
  const activeSlots = slots.filter(s => s.status !== 'removed')
  const removedSlots = slots.filter(s => s.status === 'removed')

  const isEmpty = slots.length === 0 && outbid.length === 0

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-10">{t('title')}</h1>

      {isEmpty ? (
        <div className="text-center py-20 border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm mb-1">{t('empty')}</p>
          <p className="text-muted-foreground text-xs mb-6">{t('emptyAction')}</p>
          <Link href="/bid">
            <Button variant="outline" className="font-mono text-sm">+ {t('placeBid')}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-12">

          {/* Active slots */}
          {activeSlots.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {t('activeSection')} · {activeSlots.length}
                </h2>
              </div>
              <div className="divide-y divide-border border-t border-b">
                {activeSlots.map(slot => (
                  <div key={slot.id} className="flex items-center gap-4 py-3">
                    <div className="shrink-0 w-11 h-11 rounded overflow-hidden bg-muted">
                      {slot.image_url ? (
                        <img src={slot.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" style={{ background: slot.brand_color ?? '#555' }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{slot.display_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{slot.link_url}</div>
                    </div>

                    <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      {t('statusActive')}
                    </span>

                    <div className="shrink-0 text-right">
                      <div className="font-mono font-semibold text-sm">€{slot.current_bid_eur.toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground">
                        {slot.layout_width * slot.layout_height} {t('pixels')}
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-muted-foreground text-right hidden sm:block w-24">
                      {formatDate(slot.updated_at, locale)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Outbid history */}
          {outbid.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {t('outbidSection')} · {outbid.length}
                </h2>
              </div>
              <div className="divide-y divide-border border-t border-b">
                {outbid.map(entry => (
                  <div key={entry.id} className="flex items-center gap-4 py-3">
                    <div className="shrink-0 w-11 h-11 rounded overflow-hidden bg-muted opacity-50">
                      {entry.image_url ? (
                        <img src={entry.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{entry.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('yourBid')} €{entry.bid_eur.toFixed(0)}
                        {entry.slots && (
                          <> · {t('currentBid')} €{entry.slots.current_bid_eur.toFixed(0)}</>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 text-xs font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                      {t('statusOutbid')}
                    </span>

                    <div className="shrink-0 text-xs text-muted-foreground text-right hidden sm:block w-24">
                      {entry.ended_at ? formatDate(entry.ended_at, locale) : '—'}
                    </div>

                    {entry.slots?.status === 'active' && (
                      <Link href={`/bid?outbid=${entry.slot_id}`} className="shrink-0">
                        <Button variant="outline" size="sm" className="text-xs font-mono h-7 px-3">
                          {t('rebid')} →
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Removed slots */}
          {removedSlots.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {t('removedSection')} · {removedSlots.length}
                </h2>
              </div>
              <div className="divide-y divide-border border-t border-b">
                {removedSlots.map(slot => (
                  <div key={slot.id} className="flex items-center gap-4 py-3">
                    <div className="shrink-0 w-11 h-11 rounded overflow-hidden bg-muted opacity-30">
                      {slot.image_url && (
                        <img src={slot.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate text-muted-foreground">{slot.display_name}</div>
                    </div>

                    <span className="shrink-0 text-xs font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                      {t('statusRemoved')}
                    </span>

                    <a
                      href={`mailto:support@thelastbillboard.com?subject=Report Review for Slot ${slot.id}`}
                      className="shrink-0"
                    >
                      <Button variant="ghost" size="sm" className="text-xs font-mono h-7 px-3">
                        {t('contactSupport')}
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Link href="/bid">
            <Button variant="outline" className="font-mono text-sm">+ {t('placeBid')}</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return {
    title: t('dashboard.title'),
    description: t('dashboard.description'),
    robots: { index: false, follow: true },
    openGraph: {
      title: t('dashboard.title'),
      description: t('dashboard.description'),
      url: `${baseUrl}/${locale}/dashboard`,
      siteName: 'The Last Billboard',
      locale,
      type: 'website',
    },
  }
}
