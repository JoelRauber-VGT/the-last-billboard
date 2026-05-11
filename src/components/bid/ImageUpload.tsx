'use client'

import * as React from 'react'
import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ImageUploadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: File
  onChange: (file: File | undefined) => void
  disabled?: boolean
  maxSizeMB?: number
  accept?: string
}

export const ImageUpload = React.forwardRef<HTMLDivElement, ImageUploadProps>(
  ({
    value,
    onChange,
    disabled = false,
    maxSizeMB = 10,
    accept = 'image/png,image/jpeg,image/webp',
    id,
    className,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
    ...props
  }, ref) => {
  const t = useTranslations('bid.form')
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File too large. Maximum size: ${maxSizeMB}MB`)
      return
    }

    // Validate file type
    const allowedTypes = accept.split(',')
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload PNG, JPEG, or WebP.')
      return
    }

    onChange(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && !disabled) {
      handleFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div ref={ref} className={className}>
      {/* Hidden file input */}
      <input
        id={id}
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
      />

      {/* Dropzone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative rounded-xl transition-all cursor-pointer
          ${preview ? 'border-0 p-0' : 'border-2 border-dashed p-8'}
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-muted/30'}
        `}
      >
        {preview ? (
          // Image preview
          <div className="relative rounded-xl overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-auto max-h-64 object-cover"
            />
            {!disabled && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                aria-label="Remove image"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        ) : (
          // Upload prompt
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Drop an image here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPEG, WEBP · Max {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>
    </div>
  )
})
ImageUpload.displayName = 'ImageUpload'
