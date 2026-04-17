'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { Slot } from '@/types/database'

interface UseBillboardDataReturn {
  slots: Slot[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useBillboardData(initialSlots: Slot[] = []): UseBillboardDataReturn {
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createBrowserClient()

  // Debouncing state for updates
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('slots')
        .select('*')
        .eq('status', 'active')
        .order('current_bid_eur', { ascending: false })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setSlots(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch slots'))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const refetch = useCallback(async () => {
    await fetchSlots()
  }, [fetchSlots])

  // Optimized handler for realtime changes with debouncing
  const handleSlotChange = useCallback((payload: any) => {
    const now = Date.now()

    // Debounce updates - max 1 update per 500ms
    if (now - lastUpdateRef.current < 500) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      updateTimeoutRef.current = setTimeout(() => {
        handleSlotChange(payload)
      }, 500 - (now - lastUpdateRef.current))
      return
    }

    lastUpdateRef.current = now

    if (payload.eventType === 'INSERT') {
      setSlots((prev) => {
        // Check if slot already exists to avoid duplicates
        const exists = prev.some(slot => slot.id === payload.new.id)
        if (exists) return prev
        return [payload.new, ...prev].sort((a, b) => b.current_bid_eur - a.current_bid_eur)
      })
    } else if (payload.eventType === 'UPDATE') {
      setSlots((prev) => {
        const updated = prev.map((slot) =>
          slot.id === payload.new.id ? payload.new : slot
        )
        // Re-sort after update since bid might have changed
        return updated.sort((a, b) => b.current_bid_eur - a.current_bid_eur)
      })
    } else if (payload.eventType === 'DELETE') {
      setSlots((prev) => prev.filter((slot) => slot.id !== payload.old.id))
    }
  }, [])

  // Set up real-time subscription with Page Visibility API optimization
  useEffect(() => {
    // Initial fetch if no initial data
    if (initialSlots.length === 0) {
      fetchSlots()
    }

    let channel: any = null
    let isVisible = true

    // Handle visibility change to pause/resume subscriptions
    const handleVisibilityChange = () => {
      isVisible = !document.hidden

      if (isVisible && channel) {
        // Refetch when tab becomes visible again
        fetchSlots()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Subscribe to realtime changes
    channel = supabase
      .channel('billboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'slots',
        },
        (payload) => {
          // Only process updates if tab is visible
          if (isVisible) {
            handleSlotChange(payload)
          }
        }
      )
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchSlots, handleSlotChange, initialSlots.length, supabase])

  return { slots, loading, error, refetch }
}
