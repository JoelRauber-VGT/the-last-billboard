'use client'

import { useState } from 'react'
import { BillboardCanvas } from './BillboardCanvas'
import { SlotDetailModal } from './SlotDetailModal'
import { useBillboardData } from '@/hooks/useBillboardData'
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

  const handleSlotClick = (slot: Slot) => {
    setSelectedSlot(slot)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="w-full aspect-video flex items-center justify-center bg-muted/10 rounded-lg border-2">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="w-full aspect-video rounded-lg border-2 overflow-hidden shadow-lg">
        <BillboardCanvas
          slots={slots}
          onSlotClick={handleSlotClick}
          isFrozen={isFrozen}
        />
      </div>

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
    </>
  )
}
