'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { Slot } from '@/types/database'
import { computeBillboardTreemap, type TreemapRect } from '@/lib/billboard/treemap'
import type { Viewport, ContainerSize } from '@/hooks/useBillboardViewport'

interface BillboardCanvasProps {
  slots: Slot[]
  viewport: Viewport
  size: ContainerSize
  isFrozen?: boolean
  isPanning?: boolean
  onSlotHover?: (slot: Slot | null, clientX: number, clientY: number) => void
}

/**
 * Render-only billboard. Pan/zoom is handled by the parent via
 * useBillboardViewport; here we just translate+scale the content.
 */
export function BillboardCanvas({
  slots,
  viewport,
  size,
  isFrozen = false,
  isPanning = false,
  onSlotHover,
}: BillboardCanvasProps) {
  const t = useTranslations('billboard')

  const rects = useMemo(
    () => computeBillboardTreemap(slots, size.width, size.height, 1),
    [slots, size.width, size.height]
  )

  // Only draw slots that are visible at a reasonable size on screen.
  // A rect smaller than MIN_VISIBLE_PX on screen (w*zoom < MIN_VISIBLE_PX)
  // is not worth rendering.
  const MIN_VISIBLE_PX = 6
  const visibleRects = useMemo(() => {
    return rects.filter((r) => {
      const w = (r.x1 - r.x0) * viewport.zoom
      const h = (r.y1 - r.y0) * viewport.zoom
      return w >= MIN_VISIBLE_PX && h >= MIN_VISIBLE_PX
    })
  }, [rects, viewport.zoom])

  const handleMouseEnter = useCallback(
    (slot: Slot, e: React.MouseEvent) => {
      if (isPanning) return
      onSlotHover?.(slot, e.clientX, e.clientY)
    },
    [isPanning, onSlotHover]
  )

  const handleMouseMove = useCallback(
    (slot: Slot, e: React.MouseEvent) => {
      if (isPanning) return
      onSlotHover?.(slot, e.clientX, e.clientY)
    },
    [isPanning, onSlotHover]
  )

  const handleMouseLeave = useCallback(() => {
    onSlotHover?.(null, 0, 0)
  }, [onSlotHover])

  if (slots.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-term-bg">
        <p className="font-mono text-sm text-term-muted px-4 text-center">
          {t('emptyState')}
        </p>
      </div>
    )
  }

  return (
    <>
      {isFrozen && (
        <div className="absolute top-3 left-3 z-20 bg-term-accent/90 text-black px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider pointer-events-none">
          FROZEN
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: size.width,
            height: size.height,
            transform: `translate3d(${-viewport.panX}px, ${-viewport.panY}px, 0) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {visibleRects.map((rect) => (
            <SlotTile
              key={rect.slot.id}
              rect={rect}
              isFrozen={isFrozen}
              onMouseEnter={handleMouseEnter}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          ))}
        </div>
      </div>
    </>
  )
}

interface SlotTileProps {
  rect: TreemapRect
  isFrozen: boolean
  onMouseEnter: (slot: Slot, e: React.MouseEvent) => void
  onMouseMove: (slot: Slot, e: React.MouseEvent) => void
  onMouseLeave: () => void
}

function SlotTile({ rect, isFrozen, onMouseEnter, onMouseMove, onMouseLeave }: SlotTileProps) {
  const { slot, x0, y0, x1, y1 } = rect
  const width = x1 - x0
  const height = y1 - y0

  return (
    <div
      data-slot-id={slot.id}
      onMouseEnter={(e) => onMouseEnter(slot, e)}
      onMouseMove={(e) => onMouseMove(slot, e)}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        left: x0,
        top: y0,
        width,
        height,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        cursor: isFrozen ? 'default' : 'pointer',
      }}
    >
      {slot.image_url ? (
        <img
          src={slot.image_url}
          alt={slot.display_name}
          draggable={false}
          style={{
            position: 'absolute',
            left: -width * (slot.zoom - 1) * slot.pan_x,
            top: -height * (slot.zoom - 1) * slot.pan_y,
            width: width * slot.zoom,
            height: height * slot.zoom,
            objectFit: 'cover',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 12,
            color: 'rgba(255,255,255,0.2)',
            pointerEvents: 'none',
          }}
        >
          [empty]
        </div>
      )}
    </div>
  )
}
