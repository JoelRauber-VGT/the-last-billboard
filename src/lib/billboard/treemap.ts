import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import type { Slot } from '@/types/database'

export interface TreemapRect {
  slot: Slot
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * Compute a squarified treemap of the given slots into a box of size
 * [width, height]. Weight is logarithmic in the slot's current bid so one
 * dominant bid doesn't swallow the whole canvas.
 *
 * Returns [] when slots is empty or width/height are 0.
 */
export function computeBillboardTreemap(
  slots: Slot[],
  width: number,
  height: number,
  padding = 1
): TreemapRect[] {
  if (slots.length === 0 || width <= 0 || height <= 0) return []

  type Node = { slot: Slot; weight: number }
  const nodes: Node[] = slots.map((slot) => ({
    slot,
    weight: Math.log10(slot.current_bid_eur + 1) + 0.1,
  }))

  type Root = { children: Node[] }
  const root = hierarchy<Root | Node>({ children: nodes } as Root)
    .sum((d) => ('weight' in d ? d.weight : 0))
    .sort((a, b) => (b.value || 0) - (a.value || 0))

  treemap<Root | Node>()
    .size([width, height])
    .tile(treemapSquarify)
    .padding(padding)
    .round(true)(root)

  return (root.leaves() as unknown as Array<TreemapRect & { data: Node }>).map((n) => ({
    slot: n.data.slot,
    x0: n.x0,
    y0: n.y0,
    x1: n.x1,
    y1: n.y1,
  }))
}
