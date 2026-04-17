import { checkAdminAuth } from '@/lib/admin/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 })
  }

  const { supabase } = auth

  // Fetch all reports with related data
  const { data: reports, error } = await supabase
    .from('reports')
    .select(`
      id,
      slot_id,
      reason,
      status,
      created_at,
      reporter:reporter_id(email),
      slot:slot_id(
        display_name,
        image_url
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }

  // Get report counts per slot
  const { data: reportCounts } = await supabase
    .from('reports')
    .select('slot_id')

  const countMap = new Map<string, number>()
  reportCounts?.forEach(r => {
    countMap.set(r.slot_id, (countMap.get(r.slot_id) || 0) + 1)
  })

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
    report_count: countMap.get(report.slot_id) || 1,
  }))

  return NextResponse.json({ reports: formattedReports })
}
