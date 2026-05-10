import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit/checkRateLimit'
import { z } from 'zod'

// Validation schema
const reportSchema = z.object({
  slot_id: z.string().uuid(),
  reason: z.enum([
    'inappropriate',
    'misleading',
    'copyright',
    'malware',
    'spam',
    'other',
  ]),
  details: z.string().max(500).optional(),
})

/**
 * POST /api/reports
 * Submit a report for a slot
 * - Requires authentication
 * - Rate limited to 5 reports per user per hour
 * - Validates input with Zod
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerActionClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to report a slot', code: 'auth_required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = reportSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', code: 'invalid_input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { slot_id, reason, details } = validationResult.data

    // Atomic rate limit: max 5 reports per user per hour. Backed by the
    // SECURITY DEFINER RPC `check_and_record_rate_limit` (migration 014),
    // which counts + inserts in a single SQL call to prevent TOCTOU bursts
    // where parallel requests all observe `count < limit` before any insert.
    const rl = await checkRateLimit(supabase, `report_create:${user.id}`, 5, 3600)
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: rl.error ?? 'Rate limit exceeded. Maximum 5 reports per hour.',
          code: rl.error ? 'rate_check_failed' : 'rate_limited',
        },
        { status: rl.error ? 500 : 429 }
      )
    }

    // Verify slot exists
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('id')
      .eq('id', slot_id)
      .single()

    if (slotError || !slot) {
      return NextResponse.json(
        { error: 'Slot not found', code: 'slot_not_found' },
        { status: 404 }
      )
    }

    // Insert report
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        slot_id,
        reporter_id: user.id,
        reason,
        details: details || null,
        status: 'open',
      })
      .select('id')
      .single()

    if (insertError || !report) {
      console.error('Report insertion error:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit report', code: 'report_submit_failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, reportId: report.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Report submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit report', code: 'report_submit_failed' },
      { status: 500 }
    )
  }
}
