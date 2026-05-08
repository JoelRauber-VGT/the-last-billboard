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

interface PointerInfo {
  pointerId: number
  startClientX: number
  startClientY: number
  clientX: number
  clientY: number
  lastMoves: Array<{ x: number; y: number; t: number }>
  moved: boolean
  target: EventTarget | null
}

interface PanAnchor {
  pointerId: number
  anchorClientX: number
  anchorClientY: number
  anchorPanX: number
  anchorPanY: number
  // Velocity samples before this timestamp are discarded (post-pinch grace).
  velocityActiveAt: number
}

interface PinchSession {
  startDistance: number
  startCentroidX: number
  startCentroidY: number
  startZoom: number
  startPanX: number
  startPanY: number
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

  const isPanningRef = useRef(false)
  const setPanningSync = useCallback((v: boolean) => {
    isPanningRef.current = v
    setIsPanning(v)
  }, [])

  // Multi-pointer session state
  const pointersRef = useRef<Map<number, PointerInfo>>(new Map())
  const panAnchorRef = useRef<PanAnchor | null>(null)
  const pinchRef = useRef<PinchSession | null>(null)

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

  // iOS Safari fires non-standard gesture events even when touch-action: none
  // is set on the element. Without preventDefault here, the OS will trigger
  // page-zoom and our pinch handler will desync.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const block = (e: Event) => e.preventDefault()
    el.addEventListener('gesturestart', block, { passive: false })
    el.addEventListener('gesturechange', block, { passive: false })
    el.addEventListener('gestureend', block, { passive: false })
    return () => {
      el.removeEventListener('gesturestart', block)
      el.removeEventListener('gesturechange', block)
      el.removeEventListener('gestureend', block)
    }
  }, [containerRef])

  // ---- POINTER (pan + pinch + click) ----
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

  const startPinchSession = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const ptrs = [...pointersRef.current.values()]
    if (ptrs.length !== 2) return
    const [a, b] = ptrs
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1
    const rect = el.getBoundingClientRect()
    const cx = (a.clientX + b.clientX) / 2 - rect.left
    const cy = (a.clientY + b.clientY) / 2 - rect.top
    pinchRef.current = {
      startDistance: dist,
      startCentroidX: cx,
      startCentroidY: cy,
      startZoom: viewportRef.current.zoom,
      startPanX: viewportRef.current.panX,
      startPanY: viewportRef.current.panY,
    }
  }, [containerRef])

  const reanchorPanFromRemaining = useCallback(() => {
    const ptrs = [...pointersRef.current.values()]
    if (ptrs.length !== 1) return
    const remaining = ptrs[0]
    const now = performance.now()
    panAnchorRef.current = {
      pointerId: remaining.pointerId,
      anchorClientX: remaining.clientX,
      anchorClientY: remaining.clientY,
      anchorPanX: viewportRef.current.panX,
      anchorPanY: viewportRef.current.panY,
      // 100ms grace before pan velocity becomes eligible for momentum.
      velocityActiveAt: now + 100,
    }
    remaining.lastMoves = [{ x: remaining.clientX, y: remaining.clientY, t: now }]
    remaining.moved = true
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Ignore non-primary buttons for mouse
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const el = containerRef.current
      if (!el) return

      cancelMomentum()
      cancelAnimation()

      const now = performance.now()
      const info: PointerInfo = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        clientX: e.clientX,
        clientY: e.clientY,
        lastMoves: [{ x: e.clientX, y: e.clientY, t: now }],
        moved: false,
        target: e.target,
      }
      pointersRef.current.set(e.pointerId, info)

      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // best-effort; iOS<16 may reject under multi-touch
      }

      const count = pointersRef.current.size

      if (count === 1) {
        panAnchorRef.current = {
          pointerId: e.pointerId,
          anchorClientX: e.clientX,
          anchorClientY: e.clientY,
          anchorPanX: viewportRef.current.panX,
          anchorPanY: viewportRef.current.panY,
          velocityActiveAt: now,
        }
        pinchRef.current = null
        return
      }

      if (count === 2) {
        // Suppress click on the first pointer and set up pinch session.
        for (const p of pointersRef.current.values()) p.moved = true
        startPinchSession()
        // No momentum carry-over from any pre-pinch pan.
        cancelMomentum()
        if (!isPanningRef.current) {
          setPanningSync(true)
          optionsRef.current.onPanStart?.()
        }
        return
      }

      // 3+ pointers: abort any in-progress gesture cleanly.
      for (const id of pointersRef.current.keys()) {
        try {
          el.releasePointerCapture(id)
        } catch {
          // best-effort
        }
      }
      pointersRef.current.clear()
      pinchRef.current = null
      panAnchorRef.current = null
      cancelMomentum()
      if (isPanningRef.current) {
        setPanningSync(false)
        optionsRef.current.onPanEnd?.()
      }
    },
    [containerRef, cancelMomentum, cancelAnimation, setPanningSync, startPinchSession]
  )

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const p = pointersRef.current.get(e.pointerId)
    if (!p) return

    p.clientX = e.clientX
    p.clientY = e.clientY
    const now = performance.now()
    p.lastMoves.push({ x: e.clientX, y: e.clientY, t: now })
    while (p.lastMoves.length > 2 && now - p.lastMoves[0].t > 100) {
      p.lastMoves.shift()
    }

    const count = pointersRef.current.size

    // ---- PINCH ----
    if (count === 2 && pinchRef.current) {
      const el = containerRef.current
      if (!el) return
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) || 1
      const rect = el.getBoundingClientRect()
      const cx = (a.clientX + b.clientX) / 2 - rect.left
      const cy = (a.clientY + b.clientY) / 2 - rect.top

      const ps = pinchRef.current
      const factor = dist / ps.startDistance
      const newZoom = clamp(ps.startZoom * factor, MIN_ZOOM, MAX_ZOOM)
      const zFactor = newZoom / ps.startZoom

      // Anchor: keep the content point under the start centroid stationary
      // under the current centroid. Centroid translation falls out naturally
      // because we use the *current* centroid as the reference.
      const newPanX = (ps.startPanX + ps.startCentroidX) * zFactor - cx
      const newPanY = (ps.startPanY + ps.startCentroidY) * zFactor - cy
      const currentSize = sizeRef.current
      const clamped = clampPan(newPanX, newPanY, newZoom, currentSize)
      setViewport({ zoom: newZoom, panX: clamped.panX, panY: clamped.panY })
      return
    }

    // ---- SINGLE-POINTER PAN ----
    if (count !== 1) return
    const anchor = panAnchorRef.current
    if (!anchor || anchor.pointerId !== p.pointerId) return

    const dx = p.clientX - anchor.anchorClientX
    const dy = p.clientY - anchor.anchorClientY

    if (!p.moved) {
      const startDx = p.clientX - p.startClientX
      const startDy = p.clientY - p.startClientY
      if (Math.abs(startDx) < CLICK_THRESHOLD_PX && Math.abs(startDy) < CLICK_THRESHOLD_PX) {
        return
      }
      p.moved = true
      if (viewportRef.current.zoom <= MIN_ZOOM + 0.0001) {
        // No pan at zoom 1.0; moved=true ensures no click fires later.
        return
      }
      if (!isPanningRef.current) {
        setPanningSync(true)
        optionsRef.current.onPanStart?.()
      }
    }

    if (viewportRef.current.zoom <= MIN_ZOOM + 0.0001) return

    const currentSize = sizeRef.current
    setViewport((v) => {
      const { panX, panY } = clampPan(
        anchor.anchorPanX - dx,
        anchor.anchorPanY - dy,
        v.zoom,
        currentSize
      )
      return { ...v, panX, panY }
    })
  }, [containerRef, setPanningSync])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const p = pointersRef.current.get(e.pointerId)
      if (!p) return
      const el = containerRef.current
      if (el) {
        try {
          el.releasePointerCapture(e.pointerId)
        } catch {
          // best-effort
        }
      }
      pointersRef.current.delete(e.pointerId)
      const wasPinching = pinchRef.current !== null
      const count = pointersRef.current.size

      if (count === 1) {
        if (wasPinching) {
          // 2 -> 1 transition: re-anchor pan to the remaining pointer at the
          // *current* viewport so the image does not jump.
          pinchRef.current = null
          reanchorPanFromRemaining()
        }
        return
      }

      if (count >= 2) {
        // Came down from 3+ via the abort path; stay aborted.
        return
      }

      // count === 0: session ends.
      const anchor = panAnchorRef.current
      pinchRef.current = null
      panAnchorRef.current = null

      if (!p.moved && !wasPinching) {
        // Clean tap.
        optionsRef.current.onClick?.(e.clientX, e.clientY, p.target)
        return
      }

      if (isPanningRef.current) {
        setPanningSync(false)
        optionsRef.current.onPanEnd?.()
      }

      // No pinch momentum (deliberately omitted, Day-2 if desired).
      if (wasPinching) return

      // Pan momentum from single-pointer pan. Discard samples taken before
      // velocityActiveAt (covers the 100ms grace after a 2->1 transition).
      const cutoff = anchor?.velocityActiveAt ?? 0
      const moves = p.lastMoves.filter((m) => m.t >= cutoff)
      if (moves.length >= 2) {
        const newest = moves[moves.length - 1]
        const oldest = moves[0]
        const dt = Math.max(1, newest.t - oldest.t)
        const vx = ((newest.x - oldest.x) / dt) * 16.67
        const vy = ((newest.y - oldest.y) / dt) * 16.67
        momentumRef.current.vx = vx
        momentumRef.current.vy = vy
        if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
          runMomentum()
        }
      }
    },
    [containerRef, setPanningSync, reanchorPanFromRemaining, runMomentum]
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      const p = pointersRef.current.get(e.pointerId)
      if (!p) return
      const el = containerRef.current
      if (el) {
        try {
          el.releasePointerCapture(e.pointerId)
        } catch {
          // best-effort
        }
      }
      pointersRef.current.delete(e.pointerId)
      const wasPinching = pinchRef.current !== null
      const count = pointersRef.current.size

      if (count === 1 && wasPinching) {
        // Mid-pinch cancel: still re-anchor so we don't jump if the user keeps
        // the other finger down.
        pinchRef.current = null
        reanchorPanFromRemaining()
        return
      }

      if (count >= 1) return

      // count === 0: end the session, no momentum.
      pinchRef.current = null
      panAnchorRef.current = null
      if (isPanningRef.current) {
        setPanningSync(false)
        optionsRef.current.onPanEnd?.()
      }
    },
    [containerRef, setPanningSync, reanchorPanFromRemaining]
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
