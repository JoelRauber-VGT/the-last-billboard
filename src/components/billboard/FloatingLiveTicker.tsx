'use client'

import { useState, useEffect } from 'react'
import { Rnd } from 'react-rnd'
import { GripVertical } from 'lucide-react'
import { useLiveTicker } from '@/hooks/useLiveTicker'
import { useTranslations } from 'next-intl'

interface TickerState {
  x: number
  y: number
  width: number
  height: number
}

const STORAGE_KEY = 'floatingLiveTicker'

export function FloatingLiveTicker() {
  const t = useTranslations('ticker')
  const { events } = useLiveTicker(5) // Show max 5 events
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 360, height: 0 })

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const state: TickerState = JSON.parse(saved)
        setPosition({ x: state.x, y: state.y })
        setSize({ width: state.width, height: state.height || 0 })
      } catch (e) {
        console.error('Failed to load ticker state:', e)
      }
    } else {
      // Set default position
      setPosition({ x: window.innerWidth - 360 - 24, y: 24 })
    }
  }, [])

  // Save to localStorage when position or size changes
  const saveState = (x: number, y: number, width: number, height: number) => {
    const state: TickerState = { x, y, width, height }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  if (!mounted) {
    return null // Prevent SSR mismatch
  }

  return (
    <Rnd
      className="hidden lg:block"
      position={position}
      size={{ width: size.width, height: 'auto' }}
      onDragStop={(_e, d) => {
        setPosition({ x: d.x, y: d.y })
        saveState(d.x, d.y, size.width, size.height)
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        const newWidth = parseInt(ref.style.width, 10)
        const newHeight = parseInt(ref.style.height, 10)
        setSize({ width: newWidth, height: newHeight })
        setPosition(position)
        saveState(position.x, position.y, newWidth, newHeight)
      }}
      minWidth={240}
      minHeight={100}
      maxWidth={600}
      bounds="parent"
      dragHandleClassName="drag-handle"
      enableResizing={{
        top: false,
        right: true,
        bottom: true,
        left: true,
        topRight: false,
        bottomRight: true,
        bottomLeft: true,
        topLeft: false,
      }}
    >
      <div
        className="rounded-xl overflow-hidden shadow-lg h-full flex flex-col"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Header with drag handle */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-black/5 drag-handle cursor-move">
          <GripVertical className="w-3 h-3 text-muted-foreground" />
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: '#10B981' }}
          />
          <span className="text-xs font-medium text-foreground">
            {t('title')}
          </span>
        </div>

        {/* Events */}
        <div className="p-3 space-y-0 flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-4">
              {t('empty')}
            </p>
          ) : (
            events.map((event, index) => (
              <div
                key={event.id}
                className="text-[11px] font-mono text-muted-foreground py-2"
                style={{
                  borderTop: index > 0 ? '0.5px solid rgba(0, 0, 0, 0.06)' : 'none',
                }}
              >
                {event.type === 'new' ? (
                  <span>
                    {event.displayName} → €{event.bidEur.toFixed(0)}
                  </span>
                ) : (
                  <span>
                    {event.displayName} → Slot — €{event.bidEur.toFixed(0)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Rnd>
  )
}
