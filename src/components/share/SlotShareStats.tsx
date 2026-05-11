'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, Share2 } from 'lucide-react'

interface SlotShareStatsProps {
  slotId: string
  variant?: 'inline' | 'block'
}

export function SlotShareStats({ slotId, variant = 'inline' }: SlotShareStatsProps) {
  const t = useTranslations('share.stats')
  const [stats, setStats] = useState<{ shareCount: number; clickCount: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/slots/${encodeURIComponent(slotId)}/share-stats`, {
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setStats(data)
      })
      .catch(() => {
        // advisory — silent
      })
    return () => {
      cancelled = true
    }
  }, [slotId])

  if (!stats) {
    return variant === 'block' ? (
      <div className="text-[10px] text-term-dim">·</div>
    ) : null
  }

  const content = (
    <>
      <span className="flex items-center gap-1" title={t('sharesTitle')}>
        <Share2 className="w-3 h-3" />
        {stats.shareCount}
      </span>
      <span className="flex items-center gap-1" title={t('clicksTitle')}>
        <Eye className="w-3 h-3" />
        {stats.clickCount}
      </span>
    </>
  )

  if (variant === 'block') {
    return (
      <div className="flex items-center gap-3 text-[11px] text-term-muted">
        {content}
      </div>
    )
  }
  return (
    <span className="flex items-center gap-3 text-[10px] text-term-muted">
      {content}
    </span>
  )
}
