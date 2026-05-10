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
  const { data: reports, error, count } = await supabase
    .from('reports')
    .select(
      `
      id,
      slot_id,
      reason,
      status,
      created_at,
      reporter:reporter_id(email),
      slot:slot_id(
        display_name,
        image_url,
        current_bid_eur
      )
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Failed to fetch reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports', code: 'fetch_failed' },
      { status: 500 },
    )
  }

  // Get report counts only for the slots on this page (was previously a
  // full-table scan that returned every reports row ever).
  const slotIds = Array.from(
    new Set((reports || []).map((r) => r.slot_id).filter((id): id is string => Boolean(id))),
  )

  const countMap = new Map<string, number>()
  if (slotIds.length > 0) {
    const { data: reportCounts } = await supabase
      .from('reports')
      .select('slot_id')
      .in('slot_id', slotIds)

    reportCounts?.forEach(r => {
      countMap.set(r.slot_id, (countMap.get(r.slot_id) || 0) + 1)
    })
  }

  // Format the response
  const formattedReports = reports?.map(report => ({
    id: report.id,
    slot_id: report.slot_id,
    reason: report.reason,
    status: report.status,
    created_at: report.created_at,
    reporter_email: (report.reporter as unknown as { email: string } | null)?.email || 'Unknown',
    slot_display_name: (report.slot as unknown as { display_name: string } | null)?.display_name || 'Unknown',
    slot_image_url: (report.slot as unknown as { image_url: string | null } | null)?.image_url || null,
    slot_bid_eur: (report.slot as unknown as { current_bid_eur: number } | null)?.current_bid_eur ?? 0,
    report_count: countMap.get(report.slot_id) || 1,
  }))

  return NextResponse.json({
    reports: formattedReports,
    total: count ?? 0,
    page,
    pageSize,
  })
}
