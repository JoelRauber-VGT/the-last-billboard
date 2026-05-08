import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createServerClient } from '@/lib/supabase/server'
import { isBillboardFrozenAsync } from '@/lib/freeze/getFreezeDate'
import { Link } from '@/i18n/routing'
import { BidComposer } from '@/components/bid/BidComposer'

interface SlotRow {
  id: string
  display_name: string
  current_bid_eur: number
  current_owner_id: string | null
}

export default async function BidPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ outbid?: string }>
}) {
  const { locale } = await params
  const { outbid } = await searchParams
  const t = await getTranslations({ locale, namespace: 'bid' })

  // Frozen gate — skip everything else if billboard is closed.
  if (await isBillboardFrozenAsync()) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-term-bg text-white font-mono p-6">
        <div className="max-w-md border border-term-border-light bg-term-surface p-5 space-y-3">
          <h1 className="text-lg text-term-accent">&gt; {t('frozen.title')}</h1>
          <p className="text-sm text-term-text">{t('frozen.message')}</p>
          <Link
            href="/"
            className="inline-block px-3 py-1.5 text-xs text-term-accent border border-term-accent hover:bg-term-accent/10"
          >
            [{t('frozen.backToBoard')}]
          </Link>
        </div>
      </div>
    )
  }

  // Server-side auth wall — prevents the flash-of-empty-page that the
  // client `useEffect` redirect had (Tabelle 5 Step 1).
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const qs = outbid ? `?redirect=/bid?outbid=${outbid}` : '?redirect=/bid'
    redirect(`/${locale}/login${qs}`)
  }

  // Resolve outbid slot server-side so the composer never renders with
  // stale/partial data.
  let outbidSlot: SlotRow | null = null
  let outbidError: 'not-found' | 'own-slot' | null = null

  if (outbid) {
    const { data, error } = await supabase
      .from('slots')
      .select('id, display_name, current_bid_eur, current_owner_id')
      .eq('id', outbid)
      .eq('status', 'active')
      .maybeSingle()

    if (error || !data) {
      outbidError = 'not-found'
    } else {
      const slot = data as SlotRow
      if (slot.current_owner_id === user.id) {
        outbidError = 'own-slot'
      } else {
        outbidSlot = slot
      }
    }
  }

  if (outbidError) {
    const message =
      outbidError === 'own-slot'
        ? 'You cannot outbid your own slot.'
        : t('errors.slotNotFound')
    return (
      <div className="h-full w-full flex items-center justify-center bg-term-bg text-white font-mono p-6">
        <div className="max-w-md border border-term-danger/60 bg-term-surface p-5 space-y-3">
          <h1 className="text-lg text-term-danger">&gt; error</h1>
          <p className="text-sm text-term-text">{message}</p>
          <Link
            href="/"
            className="inline-block px-3 py-1.5 text-xs text-term-accent border border-term-accent hover:bg-term-accent/10"
          >
            [back to billboard]
          </Link>
        </div>
      </div>
    )
  }

  return (
    <BidComposer
      userId={user.id}
      outbidSlot={
        outbidSlot
          ? {
              id: outbidSlot.id,
              display_name: outbidSlot.display_name,
              current_bid_eur: outbidSlot.current_bid_eur,
            }
          : null
      }
    />
  )
}
