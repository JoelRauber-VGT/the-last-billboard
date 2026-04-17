import { useState, useEffect, useRef } from 'react'

export interface Block {
  id: string
  x: number // Percentage (0-100) from container
  y: number
  width: number
  height: number
  color: string
  label: string
  price: string
  opacity: number
  entering: boolean
  displaced: boolean
}

export interface AnimationState {
  blocks: Block[]
  tickerText: string
  isFrozen: boolean
  refundBadge: string | null
  countdown: string | null
}

// Fixed colors for each company
const COMPANY_COLORS: Record<string, string> = {
  'Acme Corp': '#3B82F6',
  'TechStart': '#10B981',
  'Coffee Lab': '#F59E0B',
  'Pixel Studios': '#8B5CF6',
  'FreshBake': '#EF4444',
  'Nordic.io': '#06B6D4',
  'Bloom': '#EC4899',
}

// Helper to calculate treemap layout that fills the entire space
function calculateLayout(items: Array<{ label: string; value: number; color: string }>, width: number, height: number): Block[] {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const gap = 0.3 // Gap percentage

  // Sort items by value (largest first) for better visual hierarchy
  const sortedItems = [...items].sort((a, b) => b.value - a.value)

  const blocks: Block[] = []

  // Use a simple squarified treemap algorithm
  function squarify(items: typeof sortedItems, x: number, y: number, w: number, h: number) {
    if (items.length === 0) return

    if (items.length === 1) {
      const item = items[0]
      blocks.push({
        id: item.label,
        x: x + gap / 2,
        y: y + gap / 2,
        width: w - gap,
        height: h - gap,
        color: item.color,
        label: item.label,
        price: `€${item.value}`,
        opacity: 1,
        entering: false,
        displaced: false,
      })
      return
    }

    // Calculate midpoint
    const mid = Math.floor(items.length / 2)
    const firstHalf = items.slice(0, mid)
    const secondHalf = items.slice(mid)

    const firstSum = firstHalf.reduce((sum, item) => sum + item.value, 0)
    const secondSum = secondHalf.reduce((sum, item) => sum + item.value, 0)
    const totalSum = firstSum + secondSum

    // Split horizontally or vertically depending on aspect ratio
    if (w > h) {
      // Split horizontally
      const firstWidth = (firstSum / totalSum) * w
      squarify(firstHalf, x, y, firstWidth, h)
      squarify(secondHalf, x + firstWidth, y, w - firstWidth, h)
    } else {
      // Split vertically
      const firstHeight = (firstSum / totalSum) * h
      squarify(firstHalf, x, y, w, firstHeight)
      squarify(secondHalf, x, y + firstHeight, w, h - firstHeight)
    }
  }

  squarify(sortedItems, 0, 0, 100, 100)
  return blocks
}

export function useOnboardingAnimation(
  step: number,
  containerWidth: number,
  containerHeight: number
): AnimationState {
  const [state, setState] = useState<AnimationState>({
    blocks: [],
    tickerText: '',
    isFrozen: false,
    refundBadge: null,
    countdown: null,
  })

  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Cleanup function
  const cleanup = () => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    timeoutsRef.current = []
  }

  useEffect(() => {
    cleanup()

    // Reset state when step changes
    setState({
      blocks: [],
      tickerText: '',
      isFrozen: false,
      refundBadge: null,
      countdown: null,
    })

    if (step === 0) {
      // Step 1: Place your bid - blocks appear sequentially
      const companies = [
        { label: 'Acme Corp', value: 500, color: COMPANY_COLORS['Acme Corp'] },
        { label: 'TechStart', value: 300, color: COMPANY_COLORS['TechStart'] },
        { label: 'Coffee Lab', value: 120, color: COMPANY_COLORS['Coffee Lab'] },
        { label: 'Pixel Studios', value: 80, color: COMPANY_COLORS['Pixel Studios'] },
        { label: 'FreshBake', value: 50, color: COMPANY_COLORS['FreshBake'] },
      ]

      const addBlock = (index: number) => {
        if (index >= companies.length) return

        const currentCompanies = companies.slice(0, index + 1)
        const newBlocks = calculateLayout(currentCompanies, containerWidth, containerHeight)

        // Mark the newest block as entering
        newBlocks[newBlocks.length - 1].entering = true

        setState(prev => ({
          ...prev,
          blocks: newBlocks,
          tickerText: index === 0
            ? `Acme Corp joined — €500`
            : index === companies.length - 1
            ? `FreshBake joined — €50`
            : '',
        }))
      }

      // Stagger the appearance of blocks
      timeoutsRef.current.push(setTimeout(() => addBlock(0), 200))
      timeoutsRef.current.push(setTimeout(() => addBlock(1), 500))
      timeoutsRef.current.push(setTimeout(() => addBlock(2), 800))
      timeoutsRef.current.push(setTimeout(() => addBlock(3), 1100))
      timeoutsRef.current.push(setTimeout(() => addBlock(4), 1400))

    } else if (step === 1) {
      // Step 2: Displace competitors
      // Start with the final layout from step 1
      const initialCompanies = [
        { label: 'Acme Corp', value: 500, color: COMPANY_COLORS['Acme Corp'] },
        { label: 'TechStart', value: 300, color: COMPANY_COLORS['TechStart'] },
        { label: 'Coffee Lab', value: 120, color: COMPANY_COLORS['Coffee Lab'] },
        { label: 'Pixel Studios', value: 80, color: COMPANY_COLORS['Pixel Studios'] },
        { label: 'FreshBake', value: 50, color: COMPANY_COLORS['FreshBake'] },
      ]

      const initialBlocks = calculateLayout(initialCompanies, containerWidth, containerHeight)
      setState(prev => ({ ...prev, blocks: initialBlocks, tickerText: '' }))

      // After 800ms, show targeting message and dim Acme Corp
      timeoutsRef.current.push(setTimeout(() => {
        setState(prev => ({
          ...prev,
          blocks: prev.blocks.map(b =>
            b.id === 'Acme Corp' ? { ...b, opacity: 0.3 } : b
          ),
          tickerText: 'Nordic.io is targeting Acme Corp...',
        }))
      }, 800))

      // After 1800ms, displace Acme Corp with Nordic.io
      timeoutsRef.current.push(setTimeout(() => {
        const newCompanies = [
          { label: 'Nordic.io', value: 800, color: COMPANY_COLORS['Nordic.io'] },
          { label: 'TechStart', value: 300, color: COMPANY_COLORS['TechStart'] },
          { label: 'Bloom', value: 200, color: COMPANY_COLORS['Bloom'] },
          { label: 'Coffee Lab', value: 120, color: COMPANY_COLORS['Coffee Lab'] },
          { label: 'Pixel Studios', value: 80, color: COMPANY_COLORS['Pixel Studios'] },
          { label: 'FreshBake', value: 50, color: COMPANY_COLORS['FreshBake'] },
        ]

        const newBlocks = calculateLayout(newCompanies, containerWidth, containerHeight)

        // Mark Nordic.io as displaced (for flash effect)
        newBlocks[0].displaced = true

        setState(prev => ({
          ...prev,
          blocks: newBlocks,
          tickerText: 'Nordic.io displaced Acme Corp — €800',
        }))
      }, 1800))

      // After 2600ms, show refund badge
      timeoutsRef.current.push(setTimeout(() => {
        setState(prev => ({
          ...prev,
          refundBadge: 'Acme Corp refunded €450',
        }))
      }, 2600))

    } else if (step === 2) {
      // Step 3: The freeze
      // Start with the final layout from step 2
      const frozenCompanies = [
        { label: 'Nordic.io', value: 800, color: COMPANY_COLORS['Nordic.io'] },
        { label: 'TechStart', value: 300, color: COMPANY_COLORS['TechStart'] },
        { label: 'Bloom', value: 200, color: COMPANY_COLORS['Bloom'] },
        { label: 'Coffee Lab', value: 120, color: COMPANY_COLORS['Coffee Lab'] },
        { label: 'Pixel Studios', value: 80, color: COMPANY_COLORS['Pixel Studios'] },
        { label: 'FreshBake', value: 50, color: COMPANY_COLORS['FreshBake'] },
      ]

      const frozenBlocks = calculateLayout(frozenCompanies, containerWidth, containerHeight)
      setState(prev => ({ ...prev, blocks: frozenBlocks, countdown: '00:00:03' }))

      // Countdown sequence
      timeoutsRef.current.push(setTimeout(() => {
        setState(prev => ({ ...prev, countdown: '00:00:03', tickerText: '00:00:03 remaining...' }))
      }, 0))

      timeoutsRef.current.push(setTimeout(() => {
        setState(prev => ({ ...prev, countdown: '00:00:02', tickerText: '00:00:02 remaining...' }))
      }, 1000))

      timeoutsRef.current.push(setTimeout(() => {
        setState(prev => ({ ...prev, countdown: '00:00:01', tickerText: '00:00:01 remaining...' }))
      }, 2000))

      // Freeze at 3000ms
      timeoutsRef.current.push(setTimeout(() => {
        setState(prev => ({
          ...prev,
          countdown: '00:00:00',
          tickerText: 'Billboard is now frozen forever',
          isFrozen: true,
        }))
      }, 3000))
    }

    return cleanup
  }, [step, containerWidth, containerHeight])

  return state
}
