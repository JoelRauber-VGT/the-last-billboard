'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Circle } from 'lucide-react'

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

export function RealtimeStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const supabase = createBrowserClient()

  useEffect(() => {
    // Create a test channel to monitor connection status
    const channel = supabase
      .channel('status-check')
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setStatus('disconnected')
        } else if (status === 'TIMED_OUT') {
          setStatus('disconnected')
        }
      })

    // Listen for connection state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setStatus('disconnected')
      }
    })

    return () => {
      supabase.removeChannel(channel)
      authListener?.subscription.unsubscribe()
    }
  }, [supabase])

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'fill-green-500 text-green-500'
      case 'connecting':
        return 'fill-yellow-500 text-yellow-500 animate-pulse'
      case 'disconnected':
        return 'fill-gray-400 text-gray-400'
      default:
        return 'fill-gray-400 text-gray-400'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Live'
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Offline'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Circle className={`h-2 w-2 ${getStatusColor()}`} />
      <span>{getStatusText()}</span>
    </div>
  )
}
