'use client'

import React from 'react'

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  zoom: number
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset, zoom }: ZoomControlsProps) {
  const canZoomOut = zoom > 1.0001
  const canZoomIn = zoom < 4.9999
  return (
    <div
      className="absolute bottom-4 left-4 z-20 flex flex-col select-none"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(96, 165, 250, 0.3)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <ZoomButton label="zoom in" onClick={onZoomIn} disabled={!canZoomIn} symbol="+" />
      <div style={{ height: 1, background: 'rgba(96, 165, 250, 0.15)' }} />
      <ZoomButton label="zoom out" onClick={onZoomOut} disabled={!canZoomOut} symbol="−" />
      <div style={{ height: 1, background: 'rgba(96, 165, 250, 0.15)' }} />
      <ZoomButton label="reset view" onClick={onReset} disabled={false} symbol="⊡" />
    </div>
  )
}

interface ZoomButtonProps {
  onClick: () => void
  disabled: boolean
  symbol: string
  label: string
}

function ZoomButton({ onClick, disabled, symbol, label }: ZoomButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="zoom-btn"
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: disabled ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        fontSize: 16,
        fontWeight: 500,
        lineHeight: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 120ms ease, color 120ms ease, box-shadow 120ms ease',
        border: 'none',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        const el = e.currentTarget
        el.style.background = 'rgba(96, 165, 250, 0.12)'
        el.style.color = '#60a5fa'
        el.style.boxShadow = 'inset 0 0 0 1px rgba(96, 165, 250, 0.25)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.background = 'transparent'
        el.style.color = disabled ? 'rgba(255,255,255,0.2)' : '#e5e7eb'
        el.style.boxShadow = 'none'
      }}
    >
      {symbol}
    </button>
  )
}
