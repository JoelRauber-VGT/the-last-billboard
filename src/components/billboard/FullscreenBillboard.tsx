'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useBillboardData } from '@/hooks/useBillboardData'
import { useBillboardViewport } from '@/hooks/useBillboardViewport'
import { BillboardCanvas } from './BillboardCanvas'
import { Minimap } from './Minimap'
import { ZoomControls } from './ZoomControls'
import { SlotTooltip } from './SlotTooltip'
import { SlotDetailModal } from './SlotDetailModal'
import { OnboardingModal, useOnboarding } from '../onboarding/OnboardingModal'
import type { Slot } from '@/types/database'

interface FullscreenBillboardProps {
  initialSlots?: Slot[]
  isFrozen?: boolean
}

export function FullscreenBillboard({
  initialSlots = [],
  isFrozen = false,
}: FullscreenBillboardProps) {
  const { slots } = useBillboardData(initialSlots)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const searchParams = useSearchParams()
  const deepLinkSlotId = searchParams.get('slot')
  const consumedDeepLinkRef = useRef(false)

  useEffect(() => {
    if (consumedDeepLinkRef.current) return
    if (!deepLinkSlotId) return
    if (slots.length === 0) return
    const target = slots.find((s) => s.id === deepLinkSlotId)
    if (!target) return
    consumedDeepLinkRef.current = true
    setSelectedSlot(target)
    setModalOpen(true)

    // Inbound click tracking: only when arriving from a share link, and
    // only once per browser session per slot to avoid refresh inflation.
    const utmSource = searchParams.get('utm_source')
    if (utmSource === 'share') {
      const sessionKey = `tlb-inbound-click:${deepLinkSlotId}`
      try {
        if (typeof window !== 'undefined' && !window.sessionStorage.getItem(sessionKey)) {
          window.sessionStorage.setItem(sessionKey, '1')
          fetch(`/api/slots/${encodeURIComponent(deepLinkSlotId)}/share-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kind: 'click',
              platform: searchParams.get('utm_medium') || 'inbound',
              variant: searchParams.get('utm_campaign') || 'inbound',
            }),
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        // sessionStorage may be blocked — silent.
      }
    }
  }, [deepLinkSlotId, slots, searchParams])
  const [hoveredSlot, setHoveredSlot] = useState<Slot | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const { isOpen: onboardingOpen, close: closeOnboarding } = useOnboarding()

  const containerRef = useRef<HTMLDivElement>(null)
  const slotsRef = useRef<Slot[]>(slots)
  slotsRef.current = slots

  // Click handling is wired from inside the viewport hook: a qualifying
  // pointerup (no pan) calls us with the original pointerdown target. Walk
  // the DOM for a data-slot-id to map to a slot.
  const handleClick = useCallback(
    (_x: number, _y: number, target: EventTarget | null) => {
      if (isFrozen) return
      if (!(target instanceof Element)) return
      const slotEl = target.closest('[data-slot-id]') as HTMLElement | null
      if (!slotEl) return
      const slotId = slotEl.dataset.slotId
      if (!slotId) return
      const slot = slotsRef.current.find((s) => s.id === slotId)
      if (!slot) return
      setSelectedSlot(slot)
      setModalOpen(true)
    },
    [isFrozen]
  )

  const handlePanStart = useCallback(() => setHoveredSlot(null), [])

  const {
    viewport,
    size,
    isPanning,
    pointerHandlers,
    zoomBy,
    reset,
    animateTo,
    setPanImmediate,
  } = useBillboardViewport(containerRef, {
    onClick: handleClick,
    onPanStart: handlePanStart,
  })

  const handleSlotHover = useCallback((slot: Slot | null, clientX: number, clientY: number) => {
    setHoveredSlot(slot)
    if (slot) setCursor({ x: clientX, y: clientY })
  }, [])

  const handleCenterAt = useCallback(
    (panX: number, panY: number) => {
      animateTo({ panX, panY }, 200)
    },
    [animateTo]
  )

  const cursorStyle = isFrozen
    ? 'default'
    : isPanning
      ? 'grabbing'
      : viewport.zoom > 1.0001
        ? 'grab'
        : 'default'

  return (
    <>
      <div
        ref={containerRef}
        {...pointerHandlers}
        className="relative w-full h-full bg-term-bg overflow-hidden touch-none"
        style={{ cursor: cursorStyle }}
      >
        <BillboardCanvas
          slots={slots}
          viewport={viewport}
          size={size}
          isPanning={isPanning}
          isFrozen={isFrozen}
          onSlotHover={handleSlotHover}
        />

        {/* Zoom controls (bottom-left) */}
        <ZoomControls
          zoom={viewport.zoom}
          onZoomIn={() => zoomBy(0.25)}
          onZoomOut={() => zoomBy(-0.25)}
          onReset={reset}
        />

        {/* Minimap (bottom-right) */}
        {slots.length > 0 && (
          <Minimap
            slots={slots}
            viewport={viewport}
            canvasSize={size}
            onSetPan={setPanImmediate}
            onCenterAt={handleCenterAt}
          />
        )}

      </div>

      {/* Hover tooltip — portaled to fixed position */}
      <SlotTooltip
        slot={hoveredSlot}
        clientX={cursor.x}
        clientY={cursor.y}
        isPanning={isPanning}
      />

      <SlotDetailModal
        slot={selectedSlot}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedSlot(null)
        }}
      />

      <OnboardingModal isOpen={onboardingOpen} onClose={closeOnboarding} />
    </>
  )
}
