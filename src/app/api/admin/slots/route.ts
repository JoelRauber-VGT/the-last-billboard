import { checkAdminAuth } from '@/lib/admin/auth'
import { parsePagination } from '@/lib/admin/pagination'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'forbidden' },
      { status: 404 },
    )
  }

  const { supabase } = auth
  const { page, pageSize, from, to } = parsePagination(request.nextUrl.searchParams)

  // Paginated fetch + exact total count for future Pagination-UI follow-up.
  const { data: slots, error, count } = await supabase
    .from('slots')
    .select(
      `
      id,
      display_name,
      image_url,
      current_bid_eur,
      status,
      created_at,
      owner:current_owner_id(email)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Failed to fetch slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch slots', code: 'fetch_failed' },
      { status: 500 },
    )
  }

  // Fetch history for each slot
  const slotsWithHistory = await Promise.all(
    (slots || []).map(async (slot) => {
      const { data: history } = await supabase
        .from('slot_history')
        .select(`
          id,
          display_name,
          bid_eur,
          started_at,
          ended_at,
          owner:owner_id(email)
        `)
        .eq('slot_id', slot.id)
        .order('started_at', { ascending: false })

      return {
        id: slot.id,
        display_name: slot.display_name,
        image_url: slot.image_url,
        current_bid_eur: slot.current_bid_eur,
        status: slot.status,
        created_at: slot.created_at,
        owner_email: (slot.owner as unknown as { email: string } | null)?.email || 'Unknown',
        history: (history || []).map(h => ({
          id: h.id,
          display_name: h.display_name,
          bid_eur: h.bid_eur,
          started_at: h.started_at,
          ended_at: h.ended_at,
          owner_email: (h.owner as unknown as { email: string } | null)?.email || 'Unknown',
        })),
      }
    })
  )

  return NextResponse.json({
    slots: slotsWithHistory,
    total: count ?? 0,
    page,
    pageSize,
  })
}
