/**
 * Per-aspect framing for billboard slots.
 *
 * The treemap assigns each slot a width/height purely from its (logarithmic)
 * bid weight, so the same image can be rendered as portrait, square, or
 * landscape depending on what other bids exist. With a single pan/zoom the
 * user can only pre-frame for one of those shapes; the others end up however
 * `object-fit: cover` happens to crop. To avoid that, slots store three
 * independent framings — one per aspect bucket — and the renderer picks the
 * right one from the slot's actual rendered aspect at draw time.
 *
 * Bucket boundaries are the geometric midpoints between the canonical
 * preview ratios (9:16 ≈ 0.5625, 1:1, 16:9 ≈ 1.778). That keeps each preview
 * the natural representative of its bucket.
 */

import type { Slot } from '@/types/database'

export type FramingBucket = 'portrait' | 'square' | 'landscape'

export interface Framing {
  pan_x: number
  pan_y: number
  zoom: number
}

export type Framings = Record<FramingBucket, Framing>

export const DEFAULT_FRAMING: Framing = { pan_x: 0.5, pan_y: 0.5, zoom: 1.0 }

export const DEFAULT_FRAMINGS: Framings = {
  portrait: { ...DEFAULT_FRAMING },
  square: { ...DEFAULT_FRAMING },
  landscape: { ...DEFAULT_FRAMING },
}

// Geometric midpoints between 9:16 and 1:1 (≈ 0.75) and between 1:1 and
// 16:9 (≈ 1.333). Aspect = width / height.
const PORTRAIT_THRESHOLD = 0.75
const LANDSCAPE_THRESHOLD = 1.333

export const ASPECT_PRESETS: Record<FramingBucket, number> = {
  portrait: 9 / 16,
  square: 1,
  landscape: 16 / 9,
}

export function bucketForAspect(aspect: number): FramingBucket {
  if (!Number.isFinite(aspect) || aspect <= 0) return 'square'
  if (aspect <= PORTRAIT_THRESHOLD) return 'portrait'
  if (aspect >= LANDSCAPE_THRESHOLD) return 'landscape'
  return 'square'
}

export function bucketForSize(width: number, height: number): FramingBucket {
  if (height <= 0) return 'square'
  return bucketForAspect(width / height)
}

/**
 * Coerce a value (typically `slot.framings` returned as JSONB) into a
 * fully-populated Framings object. Anything missing or malformed falls back
 * to DEFAULT_FRAMING for that bucket. Numbers are clamped to the same ranges
 * the bid form enforces (pan ∈ [0,1], zoom ∈ [1,3]) so an out-of-band value
 * in the DB cannot break the renderer.
 */
export function normalizeFramings(input: unknown): Framings {
  if (!input || typeof input !== 'object') return { ...DEFAULT_FRAMINGS }
  const obj = input as Record<string, unknown>
  return {
    portrait: normalizeFraming(obj.portrait),
    square: normalizeFraming(obj.square),
    landscape: normalizeFraming(obj.landscape),
  }
}

export function normalizeFraming(input: unknown): Framing {
  if (!input || typeof input !== 'object') return { ...DEFAULT_FRAMING }
  const obj = input as Record<string, unknown>
  const pan_x = clamp01(toNumber(obj.pan_x, 0.5))
  const pan_y = clamp01(toNumber(obj.pan_y, 0.5))
  const zoom = clampZoom(toNumber(obj.zoom, 1.0))
  return { pan_x, pan_y, zoom }
}

function toNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function clampZoom(v: number): number {
  return Math.max(1, Math.min(3, v))
}

/**
 * Pick the framing the renderer should use for a slot rendered at the given
 * pixel dimensions. Falls back to the slot's legacy pan_x/pan_y/zoom when
 * `slot.framings` is missing (older rows pre-migration 027).
 */
export function pickFraming(
  slot: Pick<Slot, 'pan_x' | 'pan_y' | 'zoom'> & { framings?: unknown },
  width: number,
  height: number
): Framing {
  const bucket = bucketForSize(width, height)
  const framings = slot.framings ? normalizeFramings(slot.framings) : null
  if (framings) return framings[bucket]
  return {
    pan_x: clamp01(slot.pan_x ?? 0.5),
    pan_y: clamp01(slot.pan_y ?? 0.5),
    zoom: clampZoom(slot.zoom ?? 1.0),
  }
}
