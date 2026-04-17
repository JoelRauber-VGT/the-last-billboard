'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { useTranslations } from 'next-intl'
import type { Slot } from '@/types/database'
import { config } from '@/lib/config'

interface BillboardCanvasProps {
  slots: Slot[]
  onSlotClick?: (slot: Slot) => void
  onSlotHover?: (slot: Slot | null) => void
  isFrozen?: boolean
}

interface TreemapNode {
  slot: Slot
  weight: number
}

interface TreemapLayout {
  x0: number
  y0: number
  x1: number
  y1: number
  data: TreemapNode
}

// Helper function to calculate contrast ratio and determine border color
function getContrastColor(hexColor: string | null): string {
  if (!hexColor) return '#ffffff'

  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function BillboardCanvas({
  slots,
  onSlotClick,
  onSlotHover,
  isFrozen = false,
}: BillboardCanvasProps) {
  const t = useTranslations('billboard')
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null)
  const [viewportRect, setViewportRect] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // Calculate treemap layout with logarithmic scaling
  const treemapLayout = useMemo(() => {
    if (slots.length === 0) return []

    // Create weighted nodes with logarithmic scaling
    const nodes: TreemapNode[] = slots.map((slot) => ({
      slot,
      weight: Math.log10(slot.current_bid_eur + 1),
    }))

    // Create hierarchy
    const root = hierarchy<TreemapNode | { children: TreemapNode[] }>({
      children: nodes,
    } as { children: TreemapNode[] })
      .sum((d) => ('weight' in d ? d.weight : 0))
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    // Apply treemap layout
    const treemapGenerator = treemap<TreemapNode | { children: TreemapNode[] }>()
      .size([config.canvasWidth, config.canvasHeight])
      .tile(treemapSquarify)
      .padding(1)
      .round(true)

    treemapGenerator(root)

    // Extract leaves with layout information
    return root.leaves() as unknown as TreemapLayout[]
  }, [slots])

  // Calculate dynamic initial zoom based on number of slots
  const initialZoom = useMemo(() => {
    if (slots.length === 0) return 0.1

    // For few slots, zoom in more to make them visible
    if (slots.length <= 5) return 1.0
    if (slots.length <= 20) return 0.5
    if (slots.length <= 50) return 0.3
    return 0.1
  }, [slots.length])

  // Calculate initial zoom to fit viewport
  useEffect(() => {
    if (containerRef.current && treemapLayout.length > 0) {
      const container = containerRef.current
      const containerWidth = container.offsetWidth
      const containerHeight = container.offsetHeight

      // Calculate zoom to fit
      const zoomX = containerWidth / config.canvasWidth
      const zoomY = containerHeight / config.canvasHeight
      const initialZoom = Math.min(zoomX, zoomY, 1)

      // Store for later use if needed
      container.dataset.initialZoom = String(initialZoom)
    }
  }, [treemapLayout])

  const handleSlotClick = (slot: Slot) => {
    if (isFrozen) return
    onSlotClick?.(slot)
  }

  const handleSlotHover = (slot: Slot | null) => {
    if (isFrozen) return
    setHoveredSlotId(slot?.id || null)
    onSlotHover?.(slot)
  }

  const handleTransformChange = (ref: { state: { positionX: number; positionY: number; scale: number } }) => {
    if (!containerRef.current) return

    const { positionX, positionY, scale } = ref.state
    const containerWidth = containerRef.current.offsetWidth
    const containerHeight = containerRef.current.offsetHeight

    // Calculate viewport in canvas coordinates
    setViewportRect({
      x: -positionX / scale,
      y: -positionY / scale,
      width: containerWidth / scale,
      height: containerHeight / scale,
    })
  }

  // Filter blocks that are too small to render (virtualization)
  const visibleBlocks = useMemo(() => {
    return treemapLayout.filter((node) => {
      const width = node.x1 - node.x0
      const height = node.y1 - node.y0

      // Only render blocks larger than minimum size
      return width >= 10 && height >= 10
    })
  }, [treemapLayout])

  // Empty state
  if (slots.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground text-center px-4">{t('emptyState')}</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-neutral-100 rounded-lg overflow-hidden ${isFrozen ? 'opacity-90' : ''}`}>
      {isFrozen && (
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 bg-accent text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-mono">
          FROZEN
        </div>
      )}
      <TransformWrapper
        initialScale={initialZoom}
        minScale={0.05}
        maxScale={10}
        limitToBounds={false}
        centerOnInit={true}
        onTransformed={handleTransformChange}
        onInit={handleTransformChange}
        doubleClick={{
          disabled: false,
          mode: 'zoomIn',
        }}
        panning={{
          disabled: false,
          velocityDisabled: false,
        }}
        wheel={{
          disabled: false,
          step: 0.05,
        }}
      >
        {({ zoomToElement }) => (
          <>
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
              }}
              contentStyle={{
                width: '100%',
                height: '100%',
              }}
            >
              <svg
                width={config.canvasWidth}
                height={config.canvasHeight}
                style={{ display: 'block' }}
              >
                {visibleBlocks.map((node) => {
                  const { slot } = node.data
                  const width = node.x1 - node.x0
                  const height = node.y1 - node.y0
                  const isHovered = hoveredSlotId === slot.id

                  // Check minimum block size
                  if (width < config.minBlockPixelSize || height < config.minBlockPixelSize) {
                    return null
                  }

                  const borderColor = getContrastColor(slot.brand_color)
                  const fillColor = slot.brand_color || '#888888'

                  return (
                    <g
                      key={slot.id}
                      onMouseEnter={() => handleSlotHover(slot)}
                      onMouseLeave={() => handleSlotHover(null)}
                      onClick={() => handleSlotClick(slot)}
                      style={{
                        cursor: isFrozen ? 'default' : 'pointer',
                        opacity: isHovered ? 0.8 : 1,
                        transition: 'opacity 0.2s',
                      }}
                      onDoubleClick={(e) => {
                        if (!isFrozen) {
                          e.stopPropagation()
                          zoomToElement(e.currentTarget as unknown as HTMLElement, 2, 500)
                        }
                      }}
                    >
                      <rect
                        x={node.x0}
                        y={node.y0}
                        width={width}
                        height={height}
                        fill={fillColor}
                        stroke={borderColor}
                        strokeWidth={1}
                      />
                      {slot.image_url && (
                        <image
                          x={node.x0}
                          y={node.y0}
                          width={width}
                          height={height}
                          href={slot.image_url}
                          preserveAspectRatio="xMidYMid meet"
                        />
                      )}
                      {/* Display name for large blocks */}
                      {width > 200 && height > 100 && (
                        <text
                          x={node.x0 + width / 2}
                          y={node.y0 + height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={borderColor}
                          fontSize={Math.min(width / 10, 24)}
                          fontWeight="bold"
                          style={{
                            pointerEvents: 'none',
                            textShadow: '0 0 4px rgba(0,0,0,0.5)',
                          }}
                        >
                          {slot.display_name}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </TransformComponent>

            {/* Minimap - Hidden on mobile (< 640px) */}
            <div className="hidden sm:block absolute bottom-4 right-4 w-[150px] h-[150px] md:w-[200px] md:h-[200px] bg-white/90 border-2 border-gray-300 rounded shadow-lg overflow-hidden">
              <svg
                width={200}
                height={200}
                viewBox={`0 0 ${config.canvasWidth} ${config.canvasHeight}`}
                style={{ display: 'block' }}
              >
                {/* Render all blocks in minimap with images */}
                {treemapLayout.map((node) => {
                  const { slot } = node.data
                  const width = node.x1 - node.x0
                  const height = node.y1 - node.y0
                  const fillColor = slot.brand_color || '#888888'

                  return (
                    <g key={slot.id}>
                      <rect
                        x={node.x0}
                        y={node.y0}
                        width={width}
                        height={height}
                        fill={fillColor}
                        stroke="#ffffff"
                        strokeWidth={10}
                      />
                      {slot.image_url && (
                        <image
                          x={node.x0}
                          y={node.y0}
                          width={width}
                          height={height}
                          href={slot.image_url}
                          preserveAspectRatio="xMidYMid slice"
                        />
                      )}
                    </g>
                  )
                })}
                {/* Viewport indicator */}
                <rect
                  x={viewportRect.x}
                  y={viewportRect.y}
                  width={viewportRect.width}
                  height={viewportRect.height}
                  fill="none"
                  stroke="#ff0000"
                  strokeWidth={50}
                  strokeDasharray="100,50"
                />
              </svg>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}
