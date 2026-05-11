import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_KINDS = new Set(['share', 'click'])
const ALLOWED_PLATFORMS = new Set([
  'twitter',
  'reddit',
  'facebook',
  'linkedin',
  'whatsapp',
  'telegram',
  'email',
  'copy',
  'native',
  'inbound',
  'unknown',
])
const ALLOWED_VARIANTS = new Set(['purchase', 'outbid', 'own', 'inbound'])

function hashIp(ip: string | null): string {
  const salt = process.env.SHARE_EVENT_IP_SALT ?? 'tlb-share-events'
  return createHash('sha256').update(`${salt}:${ip ?? 'unknown'}`).digest('hex').slice(0, 32)
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const { slotId } = await params
  if (!UUID_RE.test(slotId)) {
    return NextResponse.json({ error: 'invalid_slot' }, { status: 400 })
  }

  let body: { kind?: unknown; platform?: unknown; variant?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const kind = typeof body.kind === 'string' ? body.kind : ''
  const platform = typeof body.platform === 'string' ? body.platform : 'unknown'
  const variant = typeof body.variant === 'string' ? body.variant : null

  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 })
  }
  if (!ALLOWED_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: 'invalid_platform' }, { status: 400 })
  }
  if (variant !== null && !ALLOWED_VARIANTS.has(variant)) {
    return NextResponse.json({ error: 'invalid_variant' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Confirm slot exists + is active. Anyone can hit this for any active slot;
  // private endpoint is meaningless given social shares are public anyway.
  const { data: slot } = await supabase
    .from('slots')
    .select('id, status')
    .eq('id', slotId)
    .maybeSingle()
  if (!slot || (slot as { status: string }).status === 'removed') {
    return NextResponse.json({ error: 'slot_not_found' }, { status: 404 })
  }

  const ipHash = hashIp(getClientIp(request))

  // Dedupe: ignore identical (slot, kind, platform, ip_hash) within 60s.
  const sinceIso = new Date(Date.now() - 60 * 1000).toISOString()
  const { count: recent } = await supabase
    .from('slot_share_events')
    .select('id', { count: 'exact', head: true })
    .eq('slot_id', slotId)
    .eq('kind', kind)
    .eq('platform', platform)
    .eq('ip_hash', ipHash)
    .gte('created_at', sinceIso)

  if ((recent ?? 0) > 0) {
    return NextResponse.json({ ok: true, deduped: true })
  }

  // Use service-role for the insert: anonymous visitors must be able to
  // record clicks without an authed session, and the RLS insert policy
  // requires user_id be null or auth.uid().
  const service = createServiceRoleClient()
  const { error } = await (service.from('slot_share_events') as unknown as {
    insert: (row: {
      slot_id: string
      kind: string
      platform: string | null
      variant: string | null
      user_id: string | null
      ip_hash: string
    }) => Promise<{ error: unknown }>
  }).insert({
    slot_id: slotId,
    kind,
    platform,
    variant,
    user_id: user?.id ?? null,
    ip_hash: ipHash,
  })

  if (error) {
    console.error('share-event insert failed', error)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
