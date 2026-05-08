import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { createServerClient } from '@/lib/supabase/server'
import type { PublicProfileSummary } from '@/types/database'

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatBid(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function initialOf(name: string | null) {
  if (!name) return '?'
  const ch = name.trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'profile' })

  // UUID guard — prevent the RPC from rejecting non-UUID strings.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(id)) notFound()

  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('get_public_profile', {
    p_profile_id: id,
  })

  if (error) {
    console.error('get_public_profile rpc error', error)
  }

  const profile = (data as PublicProfileSummary | null) ?? null

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 font-mono text-term-text">
        <h1 className="text-xl mb-3">{t('title')}</h1>
        <p className="text-term-muted text-sm">{t('notFound')}</p>
      </div>
    )
  }

  const displayName = profile.display_name || t('noDisplayName')

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 font-mono text-term-text">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={displayName}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              objectFit: 'cover',
              background: '#0a0a0a',
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(96,165,250,0.15)',
              color: '#60a5fa',
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {initialOf(profile.display_name)}
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white">{displayName}</h1>
          <span className="text-xs text-term-muted">
            {t('joinedOn', { date: formatDate(profile.created_at, locale) })}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-10 max-w-md">
        <div className="border border-term-border-light px-4 py-3">
          <div className="text-[11px] uppercase tracking-widest text-term-muted">
            {t('stats.totalWon')}
          </div>
          <div className="text-lg text-white tabular-nums">{profile.total_won}</div>
        </div>
        <div className="border border-term-border-light px-4 py-3">
          <div className="text-[11px] uppercase tracking-widest text-term-muted">
            {t('stats.totalSpent')}
          </div>
          <div className="text-lg text-white tabular-nums">
            €{formatBid(profile.total_spent_eur, locale)}
          </div>
        </div>
      </div>

      {/* Active slots */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-widest text-term-muted mb-3">
          {t('activeSlots')} · {profile.active_slots.length}
        </h2>
        {profile.active_slots.length === 0 ? (
          <p className="text-sm text-term-muted">{t('noActive')}</p>
        ) : (
          <div className="divide-y divide-term-border-light border-t border-b border-term-border-light">
            {profile.active_slots.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 py-3"
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    flexShrink: 0,
                    background: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  {s.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.image_url}
                      alt={s.display_name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-sm text-white truncate">{s.display_name}</span>
                  <span className="text-[11px] text-term-muted">
                    {t('currentBid')}: €{formatBid(s.current_bid_eur, locale)}
                  </span>
                </div>
                <Link
                  href={`/?slot=${s.id}`}
                  className="text-xs text-term-accent hover:text-white transition-colors whitespace-nowrap"
                >
                  [{t('viewSlot')} →]
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-term-muted mb-3">
          {t('lostSlots')} · {profile.history.length}
        </h2>
        {profile.history.length === 0 ? (
          <p className="text-sm text-term-muted">{t('noHistory')}</p>
        ) : (
          <div className="divide-y divide-term-border-light border-t border-b border-term-border-light">
            {profile.history.map((h) => (
              <div key={h.id} className="flex items-center gap-4 py-3">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    background: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    opacity: 0.6,
                  }}
                >
                  {h.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={h.image_url}
                      alt={h.display_name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-sm text-term-text truncate">{h.display_name}</span>
                  <span className="text-[11px] text-term-muted">
                    {t('lostFor', { amount: formatBid(h.bid_eur, locale) })}
                    {h.ended_at && ` · ${t('endedOn', { date: formatDate(h.ended_at, locale) })}`}
                  </span>
                </div>
                <Link
                  href={`/?slot=${h.slot_id}`}
                  className="text-xs text-term-muted hover:text-white transition-colors whitespace-nowrap"
                >
                  [{t('viewSlot')} →]
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
