'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import type { Slot } from '@/types/database'
import { computeBillboardTreemap } from '@/lib/billboard/treemap'
import type { ContainerSize, Viewport } from '@/hooks/useBillboardViewport'
import { MIN_ZOOM } from '@/hooks/useBillboardViewport'

interface MinimapProps {
  slots: Slot[]
  viewport: Viewport
  /** Size of the MAIN canvas container in CSS pixels. */
  canvasSize: ContainerSize
  /**
   * Immediately set the main viewport's pan (used while dragging the viewport
   * rectangle — no momentum, 1:1 following).
   */
  onSetPan: (panX: number, panY: number) => void
  /** Animate (e.g. on click) to the given pan with the same zoom. */
  onCenterAt: (panX: number, panY: number) => void
}

const MINIMAP_WIDTH = 220
const MINIMAP_MAX_HEIGHT = 160

export function Minimap({
  slots,
  viewport,
  canvasSize,
  onSetPan,
  onCenterAt,
}: MinimapProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragStateRef = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    startPanX: number
    startPanY: number
  } | null>(null)

  // Compute minimap dimensions based on main canvas aspect ratio.
  const { mmWidth, mmHeight } = useMemo(() => {
    const mainW = canvasSize.width > 0 ? canvasSize.width : 16
    const mainH = canvasSize.height > 0 ? canvasSize.height : 9
    const ratio = mainH / mainW
    let w = MINIMAP_WIDTH
    let h = Math.round(w * ratio)
    if (h > MINIMAP_MAX_HEIGHT) {
      h = MINIMAP_MAX_HEIGHT
      w = Math.round(h / ratio)
    }
    return { mmWidth: w, mmHeight: h }
  }, [canvasSize.width, canvasSize.height])

  // Treemap for the minimap — same algorithm as the main canvas but at
  // minimap dimensions so proportions are identical.
  const rects = useMemo(
    () => computeBillboardTreemap(slots, mmWidth, mmHeight, 0.5),
    [slots, mmWidth, mmHeight]
  )

  // Viewport rectangle in minimap coordinates.
  // Main canvas: visible content runs from (panX/zoom, panY/zoom) to
  // ((panX + size.w)/zoom, (panY + size.h)/zoom) in "canvas" coordinates.
  // Fraction of the canvas = 1/zoom along each axis (when zoom >= 1).
  const rect = useMemo(() => {
    if (canvasSize.width === 0) {
      return { left: 0, top: 0, width: mmWidth, height: mmHeight }
    }
    const fracX = viewport.panX / (canvasSize.width * viewport.zoom)
    const fracY = viewport.panY / (canvasSize.height * viewport.zoom)
    const fracW = 1 / viewport.zoom
    const fracH = 1 / viewport.zoom
    return {
      left: fracX * mmWidth,
      top: fracY * mmHeight,
      width: fracW * mmWidth,
      height: fracH * mmHeight,
    }
  }, [viewport, canvasSize.width, canvasSize.height, mmWidth, mmHeight])

  /**
   * Given a click at (mmX, mmY) in minimap pixels, compute the main-canvas
   * pan that centers the viewport window on that point.
   */
  const panForMinimapPoint = useCallback(
    (mmX: number, mmY: number) => {
      const fracX = mmX / mmWidth
      const fracY = mmY / mmHeight
      // Center the viewport window of fractional size (1/zoom) on (fracX, fracY)
      const fracLeft = fracX - 1 / (2 * viewport.zoom)
      const fracTop = fracY - 1 / (2 * viewport.zoom)
      const panX = fracLeft * canvasSize.width * viewport.zoom
      const panY = fracTop * canvasSize.height * viewport.zoom
      return { panX, panY }
    },
    [viewport.zoom, canvasSize.width, canvasSize.height, mmWidth, mmHeight]
  )

  const handleRectPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      dragStateRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: viewport.panX,
        startPanY: viewport.panY,
      }
      setDragging(true)
    },
    [viewport.panX, viewport.panY]
  )

  const handleRectPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = dragStateRef.current
      if (!s || s.pointerId !== e.pointerId) return
      const dxMm = e.clientX - s.startClientX
      const dyMm = e.clientY - s.startClientY
      // Convert minimap delta → main-canvas pan delta.
      // Fraction moved = dxMm/mmWidth; pan moves by frac * canvas * zoom
      const dPanX = (dxMm / mmWidth) * canvasSize.width * viewport.zoom
      const dPanY = (dyMm / mmHeight) * canvasSize.height * viewport.zoom
      onSetPan(s.startPanX + dPanX, s.startPanY + dPanY)
    },
    [canvasSize.width, canvasSize.height, mmWidth, mmHeight, viewport.zoom, onSetPan]
  )

  const handleRectPointerUp = useCallback((e: React.PointerEvent) => {
    const s = dragStateRef.current
    if (!s || s.pointerId !== e.pointerId) return
    const target = e.currentTarget as HTMLElement
    try {
      target.releasePointerCapture(e.pointerId)
    } catch {
      // best-effort
    }
    dragStateRef.current = null
    setDragging(false)
  }, [])

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return
      const el = rootRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const mmX = e.clientX - r.left
      const mmY = e.clientY - r.top
      const { panX, panY } = panForMinimapPoint(mmX, mmY)
      onCenterAt(panX, panY)
    },
    [dragging, panForMinimapPoint, onCenterAt]
  )

  // Pan only meaningful when zoomed in.
  const canPan = viewport.zoom > MIN_ZOOM + 0.0001

  return (
    <div
      ref={rootRef}
      onClick={handleBackgroundClick}
      className="absolute bottom-4 right-4 z-20 overflow-hidden select-none"
      style={{
        width: mmWidth,
        height: mmHeight,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(96, 165, 250, 0.3)',
        borderRadius: 4,
        cursor: 'pointer',
      }}
      aria-label="Billboard minimap"
    >
      {/* Slot thumbnails */}
      {rects.map((r) => {
        const w = r.x1 - r.x0
        const h = r.y1 - r.y0
        const { slot } = r
        return (
          <div
            key={slot.id}
            style={{
              position: 'absolute',
              left: r.x0,
              top: r.y0,
              width: w,
              height: h,
              overflow: 'hidden',
              background: '#1a1a1a',
            }}
          >
            {slot.image_url && (
              <img
                src={slot.image_url}
                alt=""
                loading="lazy"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: -w * (slot.zoom - 1) * slot.pan_x,
                  top: -h * (slot.zoom - 1) * slot.pan_y,
                  width: w * slot.zoom,
                  height: h * slot.zoom,
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )}
          </div>
        )
      })}

      {/* Viewport indicator */}
      <div
        onPointerDown={canPan ? handleRectPointerDown : undefined}
        onPointerMove={handleRectPointerMove}
        onPointerUp={handleRectPointerUp}
        onPointerCancel={handleRectPointerUp}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          border: '2px solid #ef4444',
          background: 'rgba(239, 68, 68, 0.1)',
          pointerEvents: canPan ? 'auto' : 'none',
          cursor: canPan ? (dragging ? 'grabbing' : 'grab') : 'default',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
