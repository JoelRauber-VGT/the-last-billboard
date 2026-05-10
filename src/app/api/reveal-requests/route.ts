import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSchema = z.object({
  slot_id: z.string().uuid(),
  message: z.string().max(500).nullable().optional(),
})

const RATE_LIMIT_PER_24H = 3

/**
 * POST /api/reveal-requests
 * Authenticated user asks the (anonymous) owner of a slot to reveal themselves.
 * Constraints:
 *   - Slot must be is_anonymous=true
 *   - Slot must have a current_owner_id (not yet null) and not be the requester
 *   - Max 3 requests per requester per 24h (across all targets)
 *   - Unique (slot, target, requester) — no re-asks if already sent
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerActionClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'auth_required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      )
    }
    const { slot_id, message } = parsed.data

    // Rate limit
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentCount, error: rateErr } = await supabase
      .from('reveal_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', user.id)
      .gte('created_at', since)

    if (rateErr) {
      console.error('reveal-requests rate-check error', rateErr)
      return NextResponse.json(
        { error: 'Rate-limit check failed', code: 'rate_check_failed' },
        { status: 500 }
      )
    }
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_24H) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'rate_limited' },
        { status: 429 }
      )
    }

    // Resolve slot + target owner
    const { data: slot, error: slotErr } = await supabase
      .from('slots')
      .select('id, current_owner_id, is_anonymous')
      .eq('id', slot_id)
      .single()

    if (slotErr || !slot) {
      return NextResponse.json(
        { error: 'Slot not found', code: 'slot_not_found' },
        { status: 404 }
      )
    }

    const slotRow = slot as {
      id: string
      current_owner_id: string | null
      is_anonymous: boolean
    }

    if (!slotRow.is_anonymous) {
      return NextResponse.json(
        { error: 'Slot is not anonymous', code: 'slot_not_anonymous' },
        { status: 400 }
      )
    }
    if (!slotRow.current_owner_id) {
      return NextResponse.json(
        { error: 'Slot has no current owner', code: 'slot_unowned' },
        { status: 400 }
      )
    }
    if (slotRow.current_owner_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot send to yourself', code: 'self_target' },
        { status: 400 }
      )
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('reveal_requests')
      .insert({
        slot_id: slotRow.id,
        target_owner_id: slotRow.current_owner_id,
        requester_id: user.id,
        message: message ?? null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertErr) {
      // Postgres unique violation
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'Reveal request already sent', code: 'already_sent' },
          { status: 409 }
        )
      }
      console.error('reveal-requests insert error', insertErr)
      return NextResponse.json(
        { error: 'Insert failed', code: 'insert_failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, id: (inserted as { id: string }).id },
      { status: 201 }
    )
  } catch (err) {
    console.error('reveal-requests POST error', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'internal_error' },
      { status: 500 }
    )
  }
}
