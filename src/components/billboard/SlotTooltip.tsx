'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { Slot } from '@/types/database'

interface SlotTooltipProps {
  slot: Slot | null
  clientX: number
  clientY: number
  isPanning: boolean
  /** Delay before showing (ms). Resets whenever the target slot changes. */
  delayMs?: number
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max - 1) + '…'
}

function shortenUrl(url: string, max = 40) {
  try {
    const u = new URL(url)
    const display = u.host + u.pathname + u.search
    return truncate(display, max)
  } catch {
    return truncate(url, max)
  }
}

/**
 * Desktop-only hover tooltip. Uses @media (hover: hover) and (pointer: fine)
 * check: we read matchMedia once on mount; if the device can't hover, the
 * tooltip is permanently suppressed.
 */
export function SlotTooltip({
  slot,
  clientX,
  clientY,
  isPanning,
  delayMs = 200,
}: SlotTooltipProps) {
  const [desktop, setDesktop] = useState(false)
  const [visibleSlot, setVisibleSlot] = useState<Slot | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSlotIdRef = useRef<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setDesktop(mq.matches)
    const listener = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [])

  // Cancel tooltip whenever slot becomes null or we start panning.
  useEffect(() => {
    if (!desktop) {
      setVisibleSlot(null)
      return
    }
    if (isPanning || !slot) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setVisibleSlot(null)
      lastSlotIdRef.current = null
      return
    }

    if (slot.id !== lastSlotIdRef.current) {
      // new target slot — start the delay timer fresh
      lastSlotIdRef.current = slot.id
      setVisibleSlot(null)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setVisibleSlot(slot)
        timerRef.current = null
      }, delayMs)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [slot, desktop, isPanning, delayMs])

  // Position update — cursor + (12, 12), clamped to viewport.
  useEffect(() => {
    if (!visibleSlot) return
    if (typeof window === 'undefined') return
    const OFFSET = 12
    const el = rootRef.current
    const width = el?.offsetWidth ?? 220
    const height = el?.offsetHeight ?? 40
    const maxX = window.innerWidth - width - 8
    const maxY = window.innerHeight - height - 8
    const x = Math.min(Math.max(8, clientX + OFFSET), maxX)
    const y = Math.min(Math.max(8, clientY + OFFSET), maxY)
    setPos({ x, y })
  }, [visibleSlot, clientX, clientY])

  if (!desktop || !visibleSlot) return null

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 50,
        pointerEvents: 'none',
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(96, 165, 250, 0.3)',
        padding: '8px 12px',
        borderRadius: 3,
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        maxWidth: 320,
      }}
      role="tooltip"
    >
      <div style={{ color: '#ffffff', fontSize: 13, lineHeight: 1.3 }}>
        {visibleSlot.display_name}
      </div>
      {visibleSlot.link_url && (
        <div style={{ color: '#60a5fa', fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>
          {shortenUrl(visibleSlot.link_url, 40)}
        </div>
      )}
    </div>
  )
}
