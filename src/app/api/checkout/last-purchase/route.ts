import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Fast path: DB has the row and the webhook has run.
  const { data: tx } = await supabase
    .from('transactions')
    .select('slot_id, user_id, status, amount_eur')
    .eq('stripe_session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (tx?.slot_id && UUID_RE.test(tx.slot_id)) {
    const { data: slot } = await supabase
      .from('slots')
      .select(
        'id, display_name, current_bid_eur, image_url, current_owner_id, status'
      )
      .eq('id', tx.slot_id)
      .maybeSingle()

    if (slot && slot.current_owner_id === user.id) {
      const { data: displacedRow } = await supabase
        .from('slot_history')
        .select('display_name, owner_id')
        .eq('slot_id', tx.slot_id)
        .eq('displaced_by_id', user.id)
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return NextResponse.json({
        ready: true,
        pending: false,
        slot: {
          id: slot.id,
          display_name: slot.display_name,
          current_bid_eur: slot.current_bid_eur,
          image_url: slot.image_url,
        },
        outbid: displacedRow
          ? { displayName: displacedRow.display_name }
          : null,
      })
    }
  }

  // Fallback: Stripe webhook hasn't processed yet. If Stripe says the
  // payment is paid, synthesize a preview from session metadata so the
  // share UI surfaces immediately. The actual slot will appear shortly.
  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const meta = (session.metadata ?? {}) as Record<string, string | undefined>
    if (
      meta.user_id !== user.id ||
      session.payment_status !== 'paid'
    ) {
      return NextResponse.json({ ready: false }, { status: 200 })
    }

    const bid = Number.parseFloat(meta.bid_eur ?? '0')
    const outbidSlotId = meta.slot_id && UUID_RE.test(meta.slot_id) ? meta.slot_id : null

    let outbid: { displayName: string } | null = null
    if (outbidSlotId) {
      const { data: prevRow } = await supabase
        .from('slot_history')
        .select('display_name')
        .eq('slot_id', outbidSlotId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (prevRow?.display_name) {
        outbid = { displayName: prevRow.display_name }
      }
    }

    return NextResponse.json({
      ready: true,
      pending: true,
      slot: {
        id: outbidSlotId ?? sessionId,
        display_name: meta.display_name ?? 'your slot',
        current_bid_eur: Number.isFinite(bid) ? bid : 0,
        image_url: meta.image_url || null,
      },
      outbid,
    })
  } catch (err) {
    console.error('stripe fallback failed', err)
    return NextResponse.json({ ready: false }, { status: 200 })
  }
}
