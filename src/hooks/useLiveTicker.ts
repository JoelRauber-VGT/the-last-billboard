'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { SlotHistory } from '@/types/database'

export interface TickerEvent {
  id: string
  type: 'new' | 'outbid'
  displayName: string
  bidEur: number
  previousOwnerName?: string
  timestamp: Date
}

export function useLiveTicker(limit: number = 20) {
  const [events, setEvents] = useState<TickerEvent[]>([])
  const supabase = createBrowserClient()
  const fetchingRef = useRef(false)

  const fetchInitialHistory = useCallback(async () => {
    if (fetchingRef.current) return

    try {
      fetchingRef.current = true
      const { data, error } = await supabase
        .from('slot_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Failed to fetch slot history:', error)
        return
      }

      if (data) {
        const tickerEvents = data.map(historyToEvent)
        setEvents(tickerEvents)
      }
    } finally {
      fetchingRef.current = false
    }
  }, [limit, supabase])

  const historyToEvent = (history: SlotHistory): TickerEvent => {
    // Determine if this is a new slot or an outbid
    // If displaced_by_id is null and ended_at is also null, it's a current active slot (new)
    const isNew = !history.displaced_by_id && !history.ended_at

    return {
      id: history.id,
      type: isNew ? 'new' : 'outbid',
      displayName: history.display_name,
      bidEur: parseFloat(history.bid_eur.toString()),
      timestamp: new Date(history.started_at)
    }
  }

  useEffect(() => {
    let mounted = true

    // Fetch initial history
    fetchInitialHistory()

    // Subscribe to new history entries
    const channelName = `ticker-changes-${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'slot_history'
        },
        (payload) => {
          if (!mounted) return

          const history = payload.new as SlotHistory
          const event = historyToEvent(history)
          setEvents((prev) => {
            // Avoid duplicate events
            const exists = prev.some(e => e.id === event.id)
            if (exists) return prev

            // Add new event at the top and limit to max events
            return [event, ...prev].slice(0, limit)
          })
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [fetchInitialHistory, limit, supabase])

  return { events }
}
