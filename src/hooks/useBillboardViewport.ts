'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface Viewport {
  zoom: number
  panX: number
  panY: number
}

export interface ContainerSize {
  width: number
  height: number
}

export const MIN_ZOOM = 1.0
export const MAX_ZOOM = 5.0
export const CLICK_THRESHOLD_PX = 5

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

function clampPan(panX: number, panY: number, zoom: number, size: ContainerSize) {
  const maxX = size.width * (zoom - 1)
  const maxY = size.height * (zoom - 1)
  return {
    panX: clamp(panX, 0, maxX),
    panY: clamp(panY, 0, maxY),
  }
}

interface UseBillboardViewportOptions {
  onClick?: (clientX: number, clientY: number, target: EventTarget | null) => void
  onPanStart?: () => void
  onPanEnd?: () => void
}

/**
 * Custom viewport controller for the billboard.
 *
 * Coordinate model:
 *  - container = CSS pixel viewport the user sees
 *  - content = container_size * zoom
 *  - panX/panY = top-left offset of the visible window inside the content
 *    (range [0, container * (zoom - 1)])
 *
 * Rendered transform = translate(-panX, -panY) scale(zoom)
 */
export function useBillboardViewport(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseBillboardViewportOptions = {}
) {
  const [viewport, setViewport] = useState<Viewport>({ zoom: 1, panX: 0, panY: 0 })
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 })
  const [isPanning, setIsPanning] = useState(false)

  // Refs that always hold the latest values for async callbacks/rAF.
  const viewportRef = useRef(viewport)
  const sizeRef = useRef(size)
  viewportRef.current = viewport
  sizeRef.current = size

  const optionsRef = useRef(options)
  optionsRef.current = options

  // Pointer session state
  const pointerStateRef = useRef<{
    active: boolean
    pointerId: number
    startX: number
    startY: number
    startPanX: number
    startPanY: number
    lastMoves: Array<{ x: number; y: number; t: number }>
    moved: boolean
    target: EventTarget | null
  } | null>(null)

  // Momentum animation state
  const momentumRef = useRef<{ vx: number; vy: number; rafId: number | null }>({
    vx: 0,
    vy: 0,
    rafId: null,
  })

  // Pending animation (used by animateTo)
  const animationRef = useRef<number | null>(null)

  const cancelMomentum = useCallback(() => {
    if (momentumRef.current.rafId !== null) {
      cancelAnimationFrame(momentumRef.current.rafId)
      momentumRef.current.rafId = null
    }
    momentumRef.current.vx = 0
    momentumRef.current.vy = 0
  }, [])

  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }
    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  // Re-clamp pan when container resizes (avoid empty space after shrink)
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return
    setViewport((v) => {
      const { panX, panY } = clampPan(v.panX, v.panY, v.zoom, size)
      if (panX === v.panX && panY === v.panY) return v
      return { ...v, panX, panY }
    })
  }, [size])

  // ---- WHEEL (zoom toward cursor) ----
  const pendingWheelRef = useRef<{ delta: number; cx: number; cy: number } | null>(null)
  const wheelRafRef = useRef<number | null>(null)

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const el = containerRef.current
      if (!el) return
      e.preventDefault()
      cancelMomentum()
      cancelAnimation()

      // Normalize delta across line/pixel modes
      // DOM_DELTA_PIXEL = 0 (trackpad, pixel-precise)
      // DOM_DELTA_LINE  = 1 (mouse wheel, discrete ticks)
      // DOM_DELTA_PAGE  = 2
      let deltaY: number
      if (e.deltaMode === 1) {
        // line mode: treat each tick as ~100px
        deltaY = e.deltaY * 100
      } else if (e.deltaMode === 2) {
        deltaY = e.deltaY * 1000
      } else {
        deltaY = e.deltaY
      }

      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top

      // Accumulate wheel events per frame
      if (pendingWheelRef.current) {
        pendingWheelRef.current.delta += deltaY
        pendingWheelRef.current.cx = cx
        pendingWheelRef.current.cy = cy
      } else {
        pendingWheelRef.current = { delta: deltaY, cx, cy }
      }

      if (wheelRafRef.current !== null) return
      wheelRafRef.current = requestAnimationFrame(() => {
        wheelRafRef.current = null
        const pending = pendingWheelRef.current
        pendingWheelRef.current = null
        if (!pending) return

        const currentViewport = viewportRef.current
        const currentSize = sizeRef.current
        if (currentSize.width === 0 || currentSize.height === 0) return

        // Scale factor: negative delta (scroll up / pinch out) = zoom in.
        // Target: ~1.05x per line-tick (100px equivalent).
        // factor = exp(-delta * k) with k chosen so 100px delta -> 1.05x zoom.
        const k = Math.log(1.05) / 100
        const factor = Math.exp(-pending.delta * k)
        const newZoom = clamp(currentViewport.zoom * factor, MIN_ZOOM, MAX_ZOOM)

        if (newZoom === currentViewport.zoom) return

        // Keep the point under the cursor fixed:
        // contentPoint = (pan + cursor) / zoom must stay constant.
        // => newPan = contentPoint * newZoom - cursor
        const contentX = (currentViewport.panX + pending.cx) / currentViewport.zoom
        const contentY = (currentViewport.panY + pending.cy) / currentViewport.zoom
        let newPanX = contentX * newZoom - pending.cx
        let newPanY = contentY * newZoom - pending.cy

        const clamped = clampPan(newPanX, newPanY, newZoom, currentSize)
        newPanX = clamped.panX
        newPanY = clamped.panY

        setViewport({ zoom: newZoom, panX: newPanX, panY: newPanY })
      })
    },
    [containerRef, cancelMomentum, cancelAnimation]
  )

  // Attach wheel with passive: false
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const listener = (e: WheelEvent) => handleWheel(e)
    el.addEventListener('wheel', listener, { passive: false })
    return () => el.removeEventListener('wheel', listener)
  }, [containerRef, handleWheel])

  // ---- POINTER (pan + click) ----
  const runMomentum = useCallback(() => {
    const tick = () => {
      const m = momentumRef.current
      if (Math.abs(m.vx) < 0.1 && Math.abs(m.vy) < 0.1) {
        m.rafId = null
        return
      }
      setViewport((v) => {
        const currentSize = sizeRef.current
        const { panX, panY } = clampPan(v.panX - m.vx, v.panY - m.vy, v.zoom, currentSize)
        // If clamped on one axis, kill its velocity
        if (panX !== v.panX - m.vx) m.vx = 0
        if (panY !== v.panY - m.vy) m.vy = 0
        return { ...v, panX, panY }
      })
      m.vx *= 0.92
      m.vy *= 0.92
      m.rafId = requestAnimationFrame(tick)
    }
    momentumRef.current.rafId = requestAnimationFrame(tick)
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Ignore non-primary buttons for mouse
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const el = containerRef.current
      if (!el) return

      cancelMomentum()
      cancelAnimation()

      pointerStateRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: viewportRef.current.panX,
        startPanY: viewportRef.current.panY,
        lastMoves: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
        moved: false,
        target: e.target,
      }
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // best-effort
      }
    },
    [containerRef, cancelMomentum, cancelAnimation]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = pointerStateRef.current
      if (!s || !s.active || s.pointerId !== e.pointerId) return

      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY

      if (!s.moved) {
        if (Math.abs(dx) < CLICK_THRESHOLD_PX && Math.abs(dy) < CLICK_THRESHOLD_PX) {
          // still in click zone
          return
        }
        s.moved = true
        // Only allow panning when zoomed in
        if (viewportRef.current.zoom <= MIN_ZOOM + 0.0001) {
          // no-op pan at zoom 1.0 — mark as moved so we don't fire click later
          return
        }
        setIsPanning(true)
        optionsRef.current.onPanStart?.()
      }

      if (viewportRef.current.zoom <= MIN_ZOOM + 0.0001) return

      const now = performance.now()
      s.lastMoves.push({ x: e.clientX, y: e.clientY, t: now })
      // Keep only the last ~100ms of moves (for velocity calc)
      while (s.lastMoves.length > 2 && now - s.lastMoves[0].t > 100) {
        s.lastMoves.shift()
      }

      const currentSize = sizeRef.current
      setViewport((v) => {
        const { panX, panY } = clampPan(
          s.startPanX - dx,
          s.startPanY - dy,
          v.zoom,
          currentSize
        )
        return { ...v, panX, panY }
      })
    },
    []
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const s = pointerStateRef.current
      if (!s || s.pointerId !== e.pointerId) return
      const el = containerRef.current
      if (el) {
        try {
          el.releasePointerCapture(e.pointerId)
        } catch {
          // best-effort
        }
      }

      pointerStateRef.current = null

      if (!s.moved) {
        // Click
        optionsRef.current.onClick?.(e.clientX, e.clientY, s.target)
        return
      }

      if (isPanning) {
        setIsPanning(false)
        optionsRef.current.onPanEnd?.()
      }

      // Compute momentum velocity from the last few moves (~last 100ms).
      const moves = s.lastMoves
      if (moves.length >= 2) {
        const newest = moves[moves.length - 1]
        const oldest = moves[0]
        const dt = Math.max(1, newest.t - oldest.t)
        // velocity in px per frame (assuming 16.67ms frames)
        const vx = ((newest.x - oldest.x) / dt) * 16.67
        const vy = ((newest.y - oldest.y) / dt) * 16.67
        momentumRef.current.vx = vx
        momentumRef.current.vy = vy
        if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
          runMomentum()
        }
      }
    },
    [containerRef, isPanning, runMomentum]
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      const s = pointerStateRef.current
      if (!s || s.pointerId !== e.pointerId) return
      pointerStateRef.current = null
      if (isPanning) {
        setIsPanning(false)
        optionsRef.current.onPanEnd?.()
      }
    },
    [isPanning]
  )

  // ---- PROGRAMMATIC CONTROLS ----
  const animateTo = useCallback(
    (target: Partial<Viewport>, durationMs = 200) => {
      cancelMomentum()
      cancelAnimation()
      const start = viewportRef.current
      const currentSize = sizeRef.current
      const toZoom = clamp(target.zoom ?? start.zoom, MIN_ZOOM, MAX_ZOOM)
      const desiredPanX = target.panX ?? start.panX
      const desiredPanY = target.panY ?? start.panY
      const clamped = clampPan(desiredPanX, desiredPanY, toZoom, currentSize)
      const t0 = performance.now()

      const ease = (t: number) => 1 - Math.pow(1 - t, 3) // easeOutCubic

      const step = () => {
        const now = performance.now()
        const t = Math.min(1, (now - t0) / durationMs)
        const e = ease(t)
        setViewport({
          zoom: start.zoom + (toZoom - start.zoom) * e,
          panX: start.panX + (clamped.panX - start.panX) * e,
          panY: start.panY + (clamped.panY - start.panY) * e,
        })
        if (t < 1) {
          animationRef.current = requestAnimationFrame(step)
        } else {
          animationRef.current = null
        }
      }
      animationRef.current = requestAnimationFrame(step)
    },
    [cancelMomentum, cancelAnimation]
  )

  const zoomBy = useCallback(
    (delta: number) => {
      const currentViewport = viewportRef.current
      const currentSize = sizeRef.current
      if (currentSize.width === 0) return
      const newZoom = clamp(currentViewport.zoom + delta, MIN_ZOOM, MAX_ZOOM)
      if (newZoom === currentViewport.zoom) return
      // zoom toward center
      const cx = currentSize.width / 2
      const cy = currentSize.height / 2
      const contentX = (currentViewport.panX + cx) / currentViewport.zoom
      const contentY = (currentViewport.panY + cy) / currentViewport.zoom
      const panX = contentX * newZoom - cx
      const panY = contentY * newZoom - cy
      animateTo({ zoom: newZoom, panX, panY }, 200)
    },
    [animateTo]
  )

  const reset = useCallback(() => {
    animateTo({ zoom: 1, panX: 0, panY: 0 }, 200)
  }, [animateTo])

  /**
   * Set pan directly, without animation. Used for live minimap drag.
   */
  const setPanImmediate = useCallback((panX: number, panY: number) => {
    cancelMomentum()
    cancelAnimation()
    setViewport((v) => {
      const currentSize = sizeRef.current
      const clamped = clampPan(panX, panY, v.zoom, currentSize)
      return { ...v, panX: clamped.panX, panY: clamped.panY }
    })
  }, [cancelMomentum, cancelAnimation])

  // Cleanup
  useEffect(() => {
    return () => {
      cancelMomentum()
      cancelAnimation()
      if (wheelRafRef.current !== null) cancelAnimationFrame(wheelRafRef.current)
    }
  }, [cancelMomentum, cancelAnimation])

  return {
    viewport,
    size,
    isPanning,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
    animateTo,
    zoomBy,
    reset,
    setPanImmediate,
  }
}
