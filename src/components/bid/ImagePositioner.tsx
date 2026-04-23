'use client'

import * as React from 'react'
import { useCallback, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'

interface ImagePositionerProps {
  imageUrl: string
  pan: { x: number; y: number }
  zoom: number
  onPanChange: (pan: { x: number; y: number }) => void
  onZoomChange: (zoom: number) => void
  disabled?: boolean
}

const MIN_ZOOM = 1.0
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.1

/**
 * Render an image inside a fixed-size box using the exact same math as the
 * live billboard renderer: image sized `w*zoom × h*zoom`, offset by
 * `-(zoom-1)*pan` on each axis, with `object-fit: cover` centering within
 * that enlarged box. This guarantees what the user sees here is what they
 * will get on the billboard.
 */
function CoverImage({
  src,
  width,
  height,
  panX,
  panY,
  zoom,
}: {
  src: string
  width: number | string
  height: number | string
  panX: number
  panY: number
  zoom: number
}) {
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        background: '#1a1a1a',
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: `${-(zoom - 1) * panX * 100}%`,
          top: `${-(zoom - 1) * panY * 100}%`,
          width: `${zoom * 100}%`,
          height: `${zoom * 100}%`,
          objectFit: 'cover',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export function ImagePositioner({
  imageUrl,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
  disabled = false,
}: ImagePositionerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const clampPan = useCallback((x: number, y: number) => {
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      if (zoom <= MIN_ZOOM + 1e-6) return // nothing to pan at zoom 1
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)
      dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
      setIsDragging(true)
    },
    [disabled, zoom, pan.x, pan.y]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      // Renderer math: image is rendered at `W*zoom × H*zoom` and offset by
      // `-(zoom-1)*pan*W` (and the Y equivalent). Moving the cursor by dx
      // CSS pixels on the container should translate the image by the same
      // dx: dPan = -dx / (W * (zoom - 1)).
      const denomX = rect.width * (zoom - 1)
      const denomY = rect.height * (zoom - 1)
      if (denomX <= 0 || denomY <= 0) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      const next = clampPan(d.panX - dx / denomX, d.panY - dy / denomY)
      onPanChange(next)
    },
    [zoom, clampPan, onPanChange]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null
    setIsDragging(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // best-effort
    }
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (disabled) return
      e.preventDefault()
      const dir = e.deltaY > 0 ? -1 : 1
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + dir * ZOOM_STEP))
      onZoomChange(next)
    },
    [disabled, zoom, onZoomChange]
  )

  const handleZoomIn = () => {
    if (disabled) return
    onZoomChange(Math.min(MAX_ZOOM, zoom + ZOOM_STEP))
  }

  const handleZoomOut = () => {
    if (disabled) return
    const next = Math.max(MIN_ZOOM, zoom - ZOOM_STEP)
    onZoomChange(next)
    // At zoom 1 pan is irrelevant; reset to center so next zoom-in starts clean.
    if (next <= MIN_ZOOM + 1e-6) onPanChange({ x: 0.5, y: 0.5 })
  }

  const handleReset = () => {
    if (disabled) return
    onPanChange({ x: 0.5, y: 0.5 })
    onZoomChange(1.0)
  }

  const cursor =
    disabled || zoom <= MIN_ZOOM + 1e-6
      ? 'default'
      : isDragging
        ? 'grabbing'
        : 'grab'

  return (
    <div className="space-y-3">
      <div className="text-sm text-primary font-mono">&gt; position image</div>
      <p className="text-xs font-mono text-muted-foreground">
        zoom in, then drag to choose the focal point. the previews below show
        how the crop looks at the three common slot shapes.
      </p>

      {/* Interactive editor: 1:1 crop */}
      <div
        ref={containerRef}
        className="mx-auto"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 320,
          aspectRatio: '1 / 1',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <CoverImage src={imageUrl} width="100%" height="100%" panX={pan.x} panY={pan.y} zoom={zoom} />
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-[11px] font-mono text-white">
          {zoom.toFixed(1)}x
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={disabled || zoom <= MIN_ZOOM}
            className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom out"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm font-mono text-muted-foreground min-w-[3rem] text-center">
            {zoom.toFixed(1)}x
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={disabled || zoom >= MAX_ZOOM}
            className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom in"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className="text-xs font-mono text-muted-foreground hover:text-foreground underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          reset
        </button>
      </div>

      {/* Read-only aspect previews */}
      <div className="mt-2">
        <div className="text-xs font-mono text-muted-foreground mb-2">
          &gt; how it looks at different slot shapes
        </div>
        <div className="grid grid-cols-3 gap-2">
          <AspectPreview
            label="portrait"
            aspect={9 / 16}
            imageUrl={imageUrl}
            panX={pan.x}
            panY={pan.y}
            zoom={zoom}
          />
          <AspectPreview
            label="square"
            aspect={1}
            imageUrl={imageUrl}
            panX={pan.x}
            panY={pan.y}
            zoom={zoom}
          />
          <AspectPreview
            label="landscape"
            aspect={16 / 9}
            imageUrl={imageUrl}
            panX={pan.x}
            panY={pan.y}
            zoom={zoom}
          />
        </div>
      </div>
    </div>
  )
}

function AspectPreview({
  label,
  aspect,
  imageUrl,
  panX,
  panY,
  zoom,
}: {
  label: string
  aspect: number
  imageUrl: string
  panX: number
  panY: number
  zoom: number
}) {
  return (
    <div className="flex flex-col gap-1 items-center">
      <div style={{ width: '100%', aspectRatio: String(aspect), borderRadius: 3, overflow: 'hidden' }}>
        <CoverImage src={imageUrl} width="100%" height="100%" panX={panX} panY={panY} zoom={zoom} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground tracking-wide">
        {label}
      </span>
    </div>
  )
}
