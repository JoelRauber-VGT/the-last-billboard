'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useOnboardingAnimation } from './useOnboardingAnimation'

interface OnboardingTreemapProps {
  step: number
}

export function OnboardingTreemap({ step }: OnboardingTreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 220 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const animationState = useOnboardingAnimation(step, dimensions.width, dimensions.height)

  // Handle container resizing
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 220,
        })
      }
    }

    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const animationDuration = prefersReducedMotion ? 0 : 0.6
  const springConfig = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 300, damping: 20 }

  return (
    <div className="space-y-3">
      {/* Treemap Container */}
      <div
        ref={containerRef}
        className="relative w-full bg-[#0A0A0A] rounded-lg overflow-hidden"
        style={{ height: '220px' }}
      >
        {/* Blocks */}
        <AnimatePresence mode="sync">
          {animationState.blocks.map((block) => {
            // Check if block label would fit
            const blockWidthPx = (dimensions.width * block.width) / 100
            const showLabel = blockWidthPx > 60 // Only show label if block is wide enough

            return (
              <motion.div
                key={block.id}
                layout={!prefersReducedMotion}
                initial={
                  block.entering && !prefersReducedMotion
                    ? { scale: 0, opacity: 0 }
                    : undefined
                }
                animate={{
                  scale: 1,
                  opacity: block.opacity,
                  filter: animationState.isFrozen
                    ? 'grayscale(0.3) brightness(0.85)'
                    : block.displaced
                    ? 'brightness(2)'
                    : 'brightness(1)',
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={
                  block.entering
                    ? springConfig
                    : block.displaced
                    ? { duration: 0.2 }
                    : {
                        duration: animationDuration,
                        ease: [0.4, 0, 0.2, 1],
                      }
                }
                style={{
                  position: 'absolute',
                  left: `${block.x}%`,
                  top: `${block.y}%`,
                  width: `${block.width}%`,
                  height: `${block.height}%`,
                  backgroundColor: block.color,
                }}
                className="flex flex-col items-center justify-center p-2 text-center"
              >
                {showLabel && (
                  <>
                    <div className="text-[11px] font-medium text-white leading-tight">
                      {block.label}
                    </div>
                    <div
                      className="text-[9px] text-white font-mono mt-0.5"
                      style={{ opacity: 0.7 }}
                    >
                      {block.price}
                    </div>
                  </>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Ice Overlay (Step 3) */}
        <AnimatePresence>
          {animationState.isFrozen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'rgba(180, 220, 255, 0.08)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Lock Icon (Step 3) */}
        <AnimatePresence>
          {animationState.isFrozen && (
            <motion.div
              initial={prefersReducedMotion ? {} : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 200, damping: 15 }
              }
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                }}
              >
                <Lock className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Refund Badge (Step 2) */}
        <AnimatePresence>
          {animationState.refundBadge && (
            <motion.div
              initial={prefersReducedMotion ? {} : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 300, damping: 20 }
              }
              className="absolute bottom-2 left-2 px-2 py-1 rounded text-[10px] font-mono text-white"
              style={{
                background: 'rgba(16, 185, 129, 0.9)',
              }}
            >
              {animationState.refundBadge}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ticker Line */}
      <div className="h-[18px] flex items-center">
        <AnimatePresence mode="wait">
          {animationState.tickerText && (
            <motion.div
              key={animationState.tickerText}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="text-[11px] font-mono text-muted-foreground"
            >
              <span className="font-medium text-foreground">
                {animationState.tickerText.split('—')[0]}
              </span>
              {animationState.tickerText.includes('—') && (
                <span>—{animationState.tickerText.split('—')[1]}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
