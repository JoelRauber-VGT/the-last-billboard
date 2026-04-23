'use client'

import { useCallback, useRef, useState } from 'react'
import { useBillboardData } from '@/hooks/useBillboardData'
import { useBillboardViewport } from '@/hooks/useBillboardViewport'
import { BillboardCanvas } from './BillboardCanvas'
import { Minimap } from './Minimap'
import { ZoomControls } from './ZoomControls'
import { SlotTooltip } from './SlotTooltip'
import { SlotDetailModal } from './SlotDetailModal'
import { HowItWorksButton } from './HowItWorksButton'
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
  const [hoveredSlot, setHoveredSlot] = useState<Slot | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const { isOpen: onboardingOpen, open: openOnboarding, close: closeOnboarding } = useOnboarding()

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

        {/* How It Works (top-right; bottom-left is ZoomControls, bottom-right is Minimap) */}
        <div className="absolute top-4 right-4 z-20">
          <HowItWorksButton onClick={openOnboarding} />
        </div>
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
