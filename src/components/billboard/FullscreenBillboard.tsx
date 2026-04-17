'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { useBillboardData } from '@/hooks/useBillboardData'
import { BillboardCanvas } from './BillboardCanvas'
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
  const { slots, loading } = useBillboardData(initialSlots)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const { isOpen: onboardingOpen, open: openOnboarding, close: closeOnboarding } = useOnboarding()

  const handleSlotClick = (slot: Slot) => {
    setSelectedSlot(slot)
    setModalOpen(true)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5))
  }

  return (
    <>
      {/* Main fullscreen billboard container */}
      <div className="relative w-full h-full bg-term-bg overflow-hidden">
        {/* Billboard Canvas with scroll */}
        <div className="absolute inset-0 overflow-auto">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%`, height: `${100 / zoom}%` }}>
            <BillboardCanvas
              slots={slots}
              onSlotClick={handleSlotClick}
              isFrozen={isFrozen}
            />
          </div>
        </div>

        {/* How It Works Button (bottom left) - fixed position */}
        <div className="absolute bottom-6 left-6 z-10">
          <HowItWorksButton onClick={openOnboarding} />
        </div>

        {/* Zoom Controls (bottom right) - fixed position */}
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-0 overflow-hidden bg-term-surface border border-term-border-light">
          <button
            onClick={handleZoomIn}
            className="px-3 py-2 hover:bg-term-bg transition-colors border-b border-term-border-light"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4 text-term-text" />
          </button>
          <button
            onClick={handleZoomOut}
            className="px-3 py-2 hover:bg-term-bg transition-colors"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4 text-term-text" />
          </button>
        </div>
      </div>

      {/* Slot Detail Modal */}
      <SlotDetailModal
        slot={selectedSlot}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setSelectedSlot(null)
          }
        }}
      />

      {/* Onboarding Modal */}
      <OnboardingModal isOpen={onboardingOpen} onClose={closeOnboarding} />
    </>
  )
}
