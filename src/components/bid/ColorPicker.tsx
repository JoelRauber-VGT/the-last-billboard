'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'

interface ColorPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}

const predefinedColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#F97316', // orange
  '#6366F1', // indigo
  '#111111', // black
]

export const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ value, onChange, disabled = false, id, className, 'aria-describedby': ariaDescribedby, 'aria-invalid': ariaInvalid, ...props }, ref) => {
  const handleSwatchClick = (color: string) => {
    if (!disabled) {
      onChange(color)
    }
  }

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value
    // Ensure it starts with # and is a valid hex color
    if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
      onChange(hex)
    }
  }

  return (
    <div ref={ref} className={`space-y-3 ${className || ''}`}>
      {/* Color swatches */}
      <div className="flex flex-wrap gap-2">
        {predefinedColors.map((color) => {
          const isSelected = value.toUpperCase() === color.toUpperCase()
          return (
            <button
              key={color}
              type="button"
              onClick={() => handleSwatchClick(color)}
              disabled={disabled}
              className={`
                relative w-8 h-8 rounded-full transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
                ${isSelected ? 'ring-2 ring-offset-2 ring-foreground' : ''}
              `}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
              title={color}
            />
          )
        })}
      </div>

      {/* Hex input */}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={handleHexChange}
          placeholder="#888888"
          disabled={disabled}
          className="flex-1 font-mono text-sm uppercase"
          maxLength={7}
          aria-describedby={ariaDescribedby}
          aria-invalid={ariaInvalid}
        />
        {/* Color preview */}
        <div
          className="w-10 h-10 rounded border-2 border-border flex-shrink-0"
          style={{ backgroundColor: value }}
          aria-label="Color preview"
        />
      </div>
    </div>
  )
})
ColorPicker.displayName = 'ColorPicker'
