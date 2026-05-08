'use client'

import { useCallback, useRef, useState } from 'react'
import { BillboardCanvas } from './BillboardCanvas'
import { SlotDetailModal } from './SlotDetailModal'
import { useBillboardData } from '@/hooks/useBillboardData'
import { useBillboardViewport } from '@/hooks/useBillboardViewport'
import type { Slot } from '@/types/database'
import { useTranslations } from 'next-intl'

interface BillboardPreviewProps {
  initialSlots?: Slot[]
  isFrozen?: boolean
}

export function BillboardPreview({ initialSlots = [], isFrozen = false }: BillboardPreviewProps) {
  const t = useTranslations('billboard')
  const { slots, loading } = useBillboardData(initialSlots)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const slotsRef = useRef<Slot[]>(slots)
  slotsRef.current = slots

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

  const { viewport, size, isPanning, pointerHandlers } = useBillboardViewport(containerRef, {
    onClick: handleClick,
  })

  if (loading) {
    return (
      <div className="w-full aspect-video flex items-center justify-center bg-muted/10 rounded-lg border-2">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        {...pointerHandlers}
        className="w-full aspect-video rounded-lg border-2 overflow-hidden shadow-lg touch-none"
      >
        <BillboardCanvas
          slots={slots}
          viewport={viewport}
          size={size}
          isPanning={isPanning}
          isFrozen={isFrozen}
        />
      </div>

      <SlotDetailModal
        slot={selectedSlot}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedSlot(null)
        }}
      />
    </>
  )
}
