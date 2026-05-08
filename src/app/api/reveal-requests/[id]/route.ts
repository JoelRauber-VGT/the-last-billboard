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
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = respondSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_request', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // Confirm target ownership and current status
    const { data: row, error: getErr } = await supabase
      .from('reveal_requests')
      .select('id, target_owner_id, status')
      .eq('id', id)
      .single()

    if (getErr || !row) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const r = row as { id: string; target_owner_id: string; status: string }
    if (r.target_owner_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    if (r.status !== 'pending') {
      return NextResponse.json({ error: 'already_responded' }, { status: 409 })
    }

    const { error: updErr } = await supabase
      .from('reveal_requests')
      .update({
        status: parsed.data.status,
        response_message: parsed.data.response_message ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updErr) {
      console.error('reveal-requests update error', updErr)
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('reveal-requests PATCH error', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
