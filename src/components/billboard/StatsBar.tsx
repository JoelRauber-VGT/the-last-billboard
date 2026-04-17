'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Slot } from '@/types/database'

interface StatsBarProps {
  slots: Slot[]
}

export function StatsBar({ slots }: StatsBarProps) {
  const t = useTranslations('billboard')
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--:--:--')

  // Calculate total invested
  const totalInvested = slots.reduce((sum, slot) => sum + slot.current_bid_eur, 0)

  // Calculate active slots
  const activeSlots = slots.length

  // Calculate displacements today (simplified - would need real data from backend)
  const displacementsToday = 0 // Placeholder

  // Countdown timer
  useEffect(() => {
    const freezeDate = process.env.NEXT_PUBLIC_FREEZE_TIMESTAMP
      ? new Date(process.env.NEXT_PUBLIC_FREEZE_TIMESTAMP)
      : null

    if (!freezeDate) {
      setTimeRemaining('--:--:--:--')
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const diff = freezeDate.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('00:00:00:00')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(
        `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  const stats = [
    {
      value: `€${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      label: 'Total invested',
    },
    {
      value: activeSlots.toString(),
      label: 'Active slots',
    },
    {
      value: timeRemaining,
      label: 'Time remaining',
    },
    {
      value: displacementsToday.toString(),
      label: 'Displacements today',
    },
  ]

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[52px] bg-term-black border-t border-term-border flex items-center justify-center px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 w-full max-w-5xl">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-base md:text-lg font-mono text-white">
              {stat.value}
            </div>
            <div className="text-sm font-mono text-term-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
