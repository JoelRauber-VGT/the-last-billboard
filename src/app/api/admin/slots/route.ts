import { checkAdminAuth } from '@/lib/admin/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await checkAdminAuth()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 })
  }

  const { supabase } = auth

  // Fetch all slots with owner details
  const { data: slots, error } = await supabase
    .from('slots')
    .select(`
      id,
      display_name,
      image_url,
      current_bid_eur,
      status,
      created_at,
      owner:current_owner_id(email)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch slots:', error)
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
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

  return NextResponse.json({ slots: slotsWithHistory })
}
