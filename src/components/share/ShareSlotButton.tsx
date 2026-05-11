'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ShareSlotDialog } from './ShareSlotDialog'
import type { ShareVariant } from '@/lib/share/buildShareLinks'

interface ShareSlotButtonProps {
  slot: {
    id: string
    display_name: string
    current_bid_eur: number
    image_url: string | null
  }
  variant?: ShareVariant
  size?: 'sm' | 'md'
  outbidName?: string
  className?: string
}

export function ShareSlotButton({
  slot,
  variant = 'own',
  size = 'sm',
  outbidName,
  className,
}: ShareSlotButtonProps) {
  const t = useTranslations('share')
  const [open, setOpen] = useState(false)

  const sizeCls =
    size === 'sm' ? 'px-3 py-1 text-xs gap-1.5' : 'px-4 py-2 text-sm gap-2'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          `flex items-center ${sizeCls} text-term-accent border border-term-accent hover:bg-term-accent/10 transition-colors`
        }
        aria-label={t('shareNow')}
      >
        <Share2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>{t('shareShort')}</span>
      </button>
      <ShareSlotDialog
        open={open}
        onOpenChange={setOpen}
        variant={variant}
        slot={slot}
        outbidName={outbidName}
      />
    </>
  )
}
