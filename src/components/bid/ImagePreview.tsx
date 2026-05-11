'use client'

import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'

interface ImagePreviewProps {
  imageUrl: string
  layout: { width: number; height: number }
  pan: { x: number; y: number }
  zoom: number
  onPanChange: (pan: { x: number; y: number }) => void
  onZoomChange: (zoom: number) => void
  disabled?: boolean
}

const MIN_ZOOM = 1.0
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.1

export const ImagePreview = React.forwardRef<HTMLDivElement, ImagePreviewProps>(
  ({ imageUrl, layout, pan, zoom, onPanChange, onZoomChange, disabled = false }, ref) => {
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Load image dimensions for pan constraints
    useEffect(() => {
      const img = new Image()
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.src = imageUrl
    }, [imageUrl])

    // Calculate pan constraints based on layout ratio and zoom
    const getPanConstraints = () => {
      if (!imageDimensions) return { minX: 0, maxX: 1, minY: 0, maxY: 1 }

      const imageRatio = imageDimensions.width / imageDimensions.height
      const layoutRatio = layout.width / layout.height

      let minX = 0, maxX = 1, minY = 0, maxY = 1

      if (imageRatio > layoutRatio) {
        // Image is wider - horizontal pan available
        const visibleWidth = 1 / zoom
        minX = 0
        maxX = 1 - visibleWidth
      } else {
        // Image is taller - vertical pan available
        const visibleHeight = 1 / zoom
        minY = 0
        maxY = 1 - visibleHeight
      }

      return { minX, maxX, minY, maxY }
    }

    // Constrain pan values within valid range
    const constrainPan = (newPan: { x: number; y: number }) => {
      const constraints = getPanConstraints()
      return {
        x: Math.max(constraints.minX, Math.min(constraints.maxX, newPan.x)),
        y: Math.max(constraints.minY, Math.min(constraints.maxY, newPan.y)),
      }
    }

    // Mouse/touch drag handlers
    const handlePointerDown = (e: React.PointerEvent) => {
      if (disabled) return
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const deltaX = (e.clientX - dragStart.x) / rect.width / zoom
      const deltaY = (e.clientY - dragStart.y) / rect.height / zoom

      const newPan = constrainPan({
        x: pan.x - deltaX,
        y: pan.y - deltaY,
      })

      onPanChange(newPan)
      setDragStart({ x: e.clientX, y: e.clientY })
    }

    const handlePointerUp = (e: React.PointerEvent) => {
      setIsDragging(false)
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    // Wheel zoom handler
    const handleWheel = (e: React.WheelEvent) => {
      if (disabled) return
      e.preventDefault()

      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta))
      onZoomChange(newZoom)

      // Adjust pan to keep zoom centered (roughly)
      const newPan = constrainPan(pan)
      if (newPan.x !== pan.x || newPan.y !== pan.y) {
        onPanChange(newPan)
      }
    }

    // Zoom controls
    const handleZoomIn = () => {
      if (disabled) return
      const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP)
      onZoomChange(newZoom)
    }

    const handleZoomOut = () => {
      if (disabled) return
      const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP)
      onZoomChange(newZoom)

      // Constrain pan if zoomed out
      const newPan = constrainPan(pan)
      if (newPan.x !== pan.x || newPan.y !== pan.y) {
        onPanChange(newPan)
      }
    }

    const handleReset = () => {
      if (disabled) return
      onPanChange({ x: 0.5, y: 0.5 })
      onZoomChange(1.0)
    }

    return (
      <div ref={ref} className="space-y-3">
        {/* Preview label */}
        <div className="text-sm text-primary font-mono">&gt; preview</div>

        {/* Preview container */}
        <div
          ref={containerRef}
          className={`
            relative rounded-lg overflow-hidden bg-muted
            ${disabled ? 'opacity-50' : 'cursor-move'}
          `}
          style={{
            aspectRatio: `${layout.width} / ${layout.height}`,
            maxWidth: '280px',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        >
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={imageUrl}
              alt="Preview"
              className="absolute w-full h-full object-cover select-none"
              style={{
                objectPosition: `${pan.x * 100}% ${pan.y * 100}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${pan.x * 100}% ${pan.y * 100}%`,
              }}
              draggable={false}
            />
          </div>

          {/* Scale indicator */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs font-mono text-white">
            {layout.width} × {layout.height} · {zoom.toFixed(1)}x scale
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
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

          {/* Reset button */}
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
      </div>
    )
  }
)
ImagePreview.displayName = 'ImagePreview'
