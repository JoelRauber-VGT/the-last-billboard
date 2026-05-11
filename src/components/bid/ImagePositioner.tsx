'use client'

import * as React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import {
  ASPECT_PRESETS,
  DEFAULT_FRAMING,
  type Framing,
  type Framings,
  type FramingBucket,
} from '@/lib/billboard/framing'

interface ImagePositionerProps {
  imageUrl: string
  framings: Framings
  onFramingsChange: (next: Framings) => void
  disabled?: boolean
}

const MIN_ZOOM = 1.0
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.1
const BUCKETS: FramingBucket[] = ['portrait', 'square', 'landscape']

function CoverImage({
  src,
  panX,
  panY,
  zoom,
}: {
  src: string
  panX: number
  panY: number
  zoom: number
}) {
  return (
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
  )
}

function isEdited(f: Framing): boolean {
  return (
    Math.abs(f.pan_x - DEFAULT_FRAMING.pan_x) > 1e-3 ||
    Math.abs(f.pan_y - DEFAULT_FRAMING.pan_y) > 1e-3 ||
    Math.abs(f.zoom - DEFAULT_FRAMING.zoom) > 1e-3
  )
}

/**
 * Per-aspect framing editor. The treemap can render the same slot as
 * portrait, square, or landscape depending on the bid mix; each bucket gets
 * its own pan/zoom triplet. The renderer (pickFraming) chooses the bucket
 * from the slot's actual rendered aspect, so the user pre-frames for all
 * three shapes once and the right crop is applied automatically.
 */
export function ImagePositioner({
  imageUrl,
  framings,
  onFramingsChange,
  disabled = false,
}: ImagePositionerProps) {
  const [activeBucket, setActiveBucket] = useState<FramingBucket>('square')
  const active = framings[activeBucket]

  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const setActive = useCallback(
    (next: Framing) => {
      onFramingsChange({ ...framings, [activeBucket]: next })
    },
    [framings, activeBucket, onFramingsChange]
  )

  const setPan = useCallback(
    (pan: { x: number; y: number }) => {
      setActive({ ...active, pan_x: pan.x, pan_y: pan.y })
    },
    [active, setActive]
  )

  const setZoom = useCallback(
    (z: number) => {
      setActive({ ...active, zoom: z })
    },
    [active, setActive]
  )

  const clampPan = useCallback((x: number, y: number) => {
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      if (active.zoom <= MIN_ZOOM + 1e-6) return
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)
      dragRef.current = { x: e.clientX, y: e.clientY, panX: active.pan_x, panY: active.pan_y }
      setIsDragging(true)
    },
    [disabled, active.zoom, active.pan_x, active.pan_y]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const denomX = rect.width * (active.zoom - 1)
      const denomY = rect.height * (active.zoom - 1)
      if (denomX <= 0 || denomY <= 0) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      const next = clampPan(d.panX - dx / denomX, d.panY - dy / denomY)
      setPan(next)
    },
    [active.zoom, clampPan, setPan]
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
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, active.zoom + dir * ZOOM_STEP))
      setZoom(next)
    },
    [disabled, active.zoom, setZoom]
  )

  const handleZoomIn = () => {
    if (disabled) return
    setZoom(Math.min(MAX_ZOOM, active.zoom + ZOOM_STEP))
  }

  const handleZoomOut = () => {
    if (disabled) return
    const next = Math.max(MIN_ZOOM, active.zoom - ZOOM_STEP)
    if (next <= MIN_ZOOM + 1e-6) {
      setActive({ pan_x: 0.5, pan_y: 0.5, zoom: MIN_ZOOM })
    } else {
      setZoom(next)
    }
  }

  const handleResetActive = () => {
    if (disabled) return
    setActive({ ...DEFAULT_FRAMING })
  }

  const handleCopyFrom = (source: FramingBucket) => {
    if (disabled) return
    onFramingsChange({ ...framings, [activeBucket]: { ...framings[source] } })
  }

  const cursor =
    disabled || active.zoom <= MIN_ZOOM + 1e-6
      ? 'default'
      : isDragging
        ? 'grabbing'
        : 'grab'

  const activeAspect = ASPECT_PRESETS[activeBucket]
  const otherBuckets = useMemo(
    () => BUCKETS.filter((b) => b !== activeBucket),
    [activeBucket]
  )

  return (
    <div className="space-y-3 font-mono">
      <p className="text-[11px] text-term-muted leading-snug">
        &gt; frame your image for each slot shape. the billboard picks the
        right crop based on how big your slot ends up.
      </p>

      {/* Bucket tabs with thumbnails */}
      <div className="grid grid-cols-3 gap-1.5">
        {BUCKETS.map((b) => {
          const f = framings[b]
          const isActive = b === activeBucket
          const edited = isEdited(f)
          return (
            <button
              key={b}
              type="button"
              onClick={() => setActiveBucket(b)}
              disabled={disabled}
              className={`group flex flex-col items-stretch gap-1 p-1 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? 'border-term-accent bg-term-surface/60'
                  : 'border-term-border-light hover:border-term-accent/60'
              }`}
              aria-pressed={isActive}
              aria-label={`edit ${b} crop`}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: String(ASPECT_PRESETS[b]),
                  overflow: 'hidden',
                  background: '#1a1a1a',
                }}
              >
                <CoverImage src={imageUrl} panX={f.pan_x} panY={f.pan_y} zoom={f.zoom} />
              </div>
              <div className="flex items-center justify-between text-[10px] tracking-wide leading-none">
                <span className={isActive ? 'text-term-accent' : 'text-term-muted'}>
                  {b}
                </span>
                <span
                  className={`transition-opacity ${edited ? 'opacity-100 text-term-accent' : 'opacity-0'}`}
                  aria-hidden="true"
                >
                  ●
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Active editor */}
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className="border border-term-border-light"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 280,
            maxHeight: 360,
            aspectRatio: String(activeAspect),
            overflow: 'hidden',
            background: '#1a1a1a',
            cursor,
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <CoverImage src={imageUrl} panX={active.pan_x} panY={active.pan_y} zoom={active.zoom} />
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 text-[10px] text-term-muted">
            {activeBucket} · {active.zoom.toFixed(1)}x
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={disabled || active.zoom <= MIN_ZOOM}
            className="w-7 h-7 border border-term-border-light text-term-muted hover:text-white hover:border-term-accent flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom out"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs text-term-muted min-w-[3rem] text-center">
            {active.zoom.toFixed(1)}x
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={disabled || active.zoom >= MAX_ZOOM}
            className="w-7 h-7 border border-term-border-light text-term-muted hover:text-white hover:border-term-accent flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom in"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleResetActive}
          disabled={disabled || !isEdited(active)}
          className="text-[11px] text-term-muted hover:text-term-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          title="reset this format to center / 1.0x"
        >
          <RotateCcw className="w-3 h-3" />
          [reset]
        </button>
      </div>

      {/* Copy-from shortcut */}
      <div className="flex items-center gap-2 text-[10px] text-term-muted">
        <span>&gt; copy crop from:</span>
        {otherBuckets.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => handleCopyFrom(b)}
            disabled={disabled}
            className="text-term-muted hover:text-term-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors underline-offset-2 hover:underline"
          >
            [{b}]
          </button>
        ))}
      </div>
    </div>
  )
}
