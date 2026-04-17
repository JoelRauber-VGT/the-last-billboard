/**
 * Test data for verifying treemap layout with different slot counts
 */

import type { Slot } from '@/types/database'

export function generateTestSlots(count: number): Slot[] {
  const slots: Slot[] = []

  for (let i = 0; i < count; i++) {
    slots.push({
      id: `slot-${i}`,
      current_owner_id: `user-${i}`,
      current_bid_eur: Math.pow(10, Math.random() * 3), // Random bids from 1 to 1000 EUR
      image_url: i % 3 === 0 ? `https://picsum.photos/seed/${i}/400/300` : null,
      link_url: `https://example-${i}.com`,
      display_name: `Brand ${i}`,
      brand_color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      status: 'active' as const,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  return slots
}

// Performance test: Calculate treemap layout timing
export function measureTreemapPerformance(slotCount: number): { duration: number; slotCount: number } {
  const start = performance.now()
  const slots = generateTestSlots(slotCount)

  // Simulate logarithmic scaling calculation (same as in BillboardCanvas)
  const weights = slots.map(slot => Math.log10(slot.current_bid_eur + 1))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  const end = performance.now()

  return {
    duration: end - start,
    slotCount,
  }
}

// Test scenarios
export const testScenarios = [
  { name: 'Empty', count: 0, expected: 'Should show empty state' },
  { name: 'Single slot', count: 1, expected: 'Should fill entire canvas' },
  { name: 'Two slots', count: 2, expected: 'Should split canvas proportionally' },
  { name: 'Ten slots', count: 10, expected: 'Should create varied layout' },
  { name: 'Hundred slots', count: 100, expected: 'Should virtualize small blocks' },
  { name: 'Performance test', count: 500, expected: 'Should render within 100ms' },
]
