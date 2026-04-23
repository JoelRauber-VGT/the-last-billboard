'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { getTopLayoutOptions, LayoutSuggestion, formatRatio } from '@/lib/layout'

interface LayoutPickerProps {
  pixelCount: number
  imageFile: File
  imageUrl: string
  value?: { width: number; height: number }
  onChange: (layout: { width: number; height: number }) => void
  disabled?: boolean
}

export const LayoutPicker = React.forwardRef<HTMLDivElement, LayoutPickerProps>(
  ({ pixelCount, imageFile, imageUrl, value, onChange, disabled = false }, ref) => {
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
    const [layoutOptions, setLayoutOptions] = useState<LayoutSuggestion[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Load image dimensions
    useEffect(() => {
      const img = new Image()
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.src = imageUrl
    }, [imageUrl])

    // Calculate layout options when dimensions are loaded
    useEffect(() => {
      if (!imageDimensions) return

      try {
        const options = getTopLayoutOptions(
          pixelCount,
          imageDimensions.width,
          imageDimensions.height
        )
        setLayoutOptions(options)

        // Auto-select best fit (first option)
        if (options.length > 0 && !value) {
          const bestFit = options[0].option
          onChange({ width: bestFit.width, height: bestFit.height })
        }
      } catch (error) {
        console.error('Failed to calculate layout options:', error)
      }
    }, [imageDimensions, pixelCount, onChange, value])

    const handleSelect = (index: number) => {
      if (disabled) return

      setSelectedIndex(index)
      const selected = layoutOptions[index].option
      onChange({ width: selected.width, height: selected.height })
    }

    if (!imageDimensions || layoutOptions.length === 0) {
      return (
        <div ref={ref} className="text-sm text-muted-foreground">
          Calculating layout options...
        </div>
      )
    }

    const imageRatio = formatRatio(imageDimensions.width / imageDimensions.height)

    return (
      <div ref={ref} className="space-y-4">
        {/* Summary */}
        <div className="space-y-1 text-sm font-mono">
          <div className="flex gap-3">
            <span className="text-muted-foreground">amount</span>
            <span className="text-foreground">
              ${pixelCount} = {pixelCount} pixels
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-muted-foreground">image</span>
            <span className="text-foreground">
              {imageFile.name} · {imageDimensions.width}×{imageDimensions.height} ({imageRatio})
            </span>
          </div>
        </div>

        {/* Layout options header */}
        <div className="text-sm text-primary font-mono">&gt; choose layout</div>
        <p className="text-xs text-muted-foreground font-mono">
          your image fits each shape differently. fit = shown in full, crop = parts cut off.
        </p>

        {/* Layout cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {layoutOptions.map((suggestion, index) => {
            const { option } = suggestion
            const isSelected = index === selectedIndex
            const isBestFit = suggestion.isBestFit

            return (
              <button
                key={`${option.width}x${option.height}`}
                type="button"
                onClick={() => handleSelect(index)}
                disabled={disabled}
                className={`
                  relative rounded-lg border-2 transition-all p-3 text-left
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
                  ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}
                  ${isBestFit && !isSelected ? 'border-primary/30' : ''}
                `}
              >
                {/* Best fit label */}
                {isBestFit && (
                  <div className="absolute -top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-mono rounded">
                    best fit
                  </div>
                )}

                {/* Mini preview */}
                <div className="aspect-video bg-muted rounded overflow-hidden mb-2 relative">
                  <img
                    src={imageUrl}
                    alt={`Layout ${option.label}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      aspectRatio: `${option.width} / ${option.height}`,
                    }}
                  />
                </div>

                {/* Dimensions */}
                <div className="text-sm font-mono font-medium text-foreground mb-1">
                  {option.width} × {option.height}
                </div>

                {/* Meta info */}
                <div className="text-xs font-mono text-muted-foreground">
                  {formatRatio(option.ratio)} · {option.fitType}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }
)
LayoutPicker.displayName = 'LayoutPicker'
