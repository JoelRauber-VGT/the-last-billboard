import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'
import { z } from 'zod'

const respondSchema = z.object({
  status: z.enum(['accepted', 'declined']),
  response_message: z.string().max(500).nullable().optional(),
})

/**
 * PATCH /api/reveal-requests/[id]
 * Target owner accepts or declines a pending reveal request.
 * RLS ensures only the target_owner_id can update.
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

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
    const parsed = respondSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'invalid_input', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Authorization check: confirm row exists and the caller owns it.
    // (RLS also enforces this; we read first to distinguish 404 vs 403 vs 409
    // for the client.) We do NOT trust the read's `status` for the gate —
    // see the conditional UPDATE below, which atomically transitions
    // pending→accepted/declined to avoid TOCTOU between two parallel PATCHes.
    const { data: row, error: getErr } = await supabase
      .from('reveal_requests')
      .select('id, target_owner_id')
      .eq('id', id)
      .single()

    if (getErr || !row) {
      return NextResponse.json(
        { error: 'Not found', code: 'not_found' },
        { status: 404 }
      )
    }
    const r = row as { id: string; target_owner_id: string }
    if (r.target_owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'forbidden' },
        { status: 403 }
      )
    }

    // Conditional update: only transitions if status is still 'pending'.
    // If a concurrent PATCH already decided, no row matches and we return 409.
    const { data: updated, error: updErr } = await supabase
      .from('reveal_requests')
      .update({
        status: parsed.data.status,
        response_message: parsed.data.response_message ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')

    if (updErr) {
      console.error('reveal-requests update error', updErr)
      return NextResponse.json(
        { error: 'Update failed', code: 'update_failed' },
        { status: 500 }
      )
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: 'Request already responded', code: 'already_responded' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('reveal-requests PATCH error', err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'internal_error' },
      { status: 500 }
    )
  }
}
