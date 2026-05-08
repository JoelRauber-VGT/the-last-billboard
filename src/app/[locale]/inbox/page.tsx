import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createServerClient } from '@/lib/supabase/server'
import { InboxClient, type IncomingItem, type OutgoingItem } from './InboxClient'

export default async function InboxPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/login?redirect=/inbox`)

  const t = await getTranslations({ locale, namespace: 'inbox' })

  // Incoming: notifications targeted at me
  const { data: notifsRaw } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  type NotificationRow = {
    id: string
    type:
      | 'reveal_request_received'
      | 'reveal_request_accepted'
      | 'reveal_request_declined'
      | 'system'
    payload: Record<string, unknown>
    related_reveal_request_id: string | null
    read_at: string | null
    created_at: string
  }

  const notifs = (notifsRaw || []) as NotificationRow[]

  // Outgoing: reveal requests I sent
  const { data: outgoingRaw } = await supabase
    .from('reveal_requests')
    .select('*')
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  type RevealRequestRow = {
    id: string
    slot_id: string
    target_owner_id: string
    requester_id: string
    message: string | null
    status: 'pending' | 'accepted' | 'declined' | 'expired'
    response_message: string | null
    created_at: string
    responded_at: string | null
  }

  const outgoing = (outgoingRaw || []) as RevealRequestRow[]

  // Resolve names: requesters of incoming reveal requests + targets of outgoing
  const requesterIds = notifs
    .filter((n) => n.type === 'reveal_request_received')
    .map((n) => n.payload.requester_id as string)
    .filter(Boolean)

  const targetIds = outgoing.map((o) => o.target_owner_id)

  const allIds = Array.from(new Set([...requesterIds, ...targetIds]))
  let nameMap: Record<string, string | null> = {}
  if (allIds.length > 0) {
    const { data: profilesRaw } = await supabase
      .from('public_profiles')
      .select('id, display_name')
      .in('id', allIds)
    nameMap = Object.fromEntries(
      (profilesRaw || []).map((p) => [
        (p as { id: string }).id,
        (p as { display_name: string | null }).display_name,
      ])
    )
  }

  // Pull related reveal_requests for incoming (so we can show pending ones with accept/decline)
  const relatedIds = notifs
    .map((n) => n.related_reveal_request_id)
    .filter((x): x is string => Boolean(x))
  let revealMap: Record<string, RevealRequestRow> = {}
  if (relatedIds.length > 0) {
    const { data: relatedRaw } = await supabase
      .from('reveal_requests')
      .select('*')
      .in('id', relatedIds)
    revealMap = Object.fromEntries(
      ((relatedRaw || []) as RevealRequestRow[]).map((r) => [r.id, r])
    )
  }

  const incoming: IncomingItem[] = notifs.map((n) => ({
    id: n.id,
    type: n.type,
    created_at: n.created_at,
    read_at: n.read_at,
    payload: n.payload,
    related_reveal_request:
      (n.related_reveal_request_id && revealMap[n.related_reveal_request_id]) || null,
    requester_name:
      n.type === 'reveal_request_received'
        ? nameMap[n.payload.requester_id as string] || null
        : null,
  }))

  const outgoingItems: OutgoingItem[] = outgoing.map((o) => ({
    id: o.id,
    slot_id: o.slot_id,
    target_owner_id: o.target_owner_id,
    target_name: nameMap[o.target_owner_id] || null,
    message: o.message,
    response_message: o.response_message,
    status: o.status,
    created_at: o.created_at,
    responded_at: o.responded_at,
  }))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 font-mono text-term-text">
      <h1 className="text-xl font-bold mb-6 text-white">{t('title')}</h1>
      <InboxClient incoming={incoming} outgoing={outgoingItems} locale={locale} />
    </div>
  )
}
