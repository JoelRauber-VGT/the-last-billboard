'use client'

import { useLiveTicker } from '@/hooks/useLiveTicker'
import { useTranslations } from 'next-intl'
import { formatDistanceToNow } from 'date-fns'
import { de, fr, es, enUS } from 'date-fns/locale'
import { useParams } from 'next/navigation'
import { useRef, useEffect, useState } from 'react'

const localeMap = {
  en: enUS,
  de: de,
  fr: fr,
  es: es
}

export function LiveTicker() {
  const t = useTranslations('ticker')
  const { events } = useLiveTicker(20)
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const dateLocale = localeMap[locale as keyof typeof localeMap] || enUS

  // Track user scroll position to avoid auto-scroll when user is reading
  const containerRef = useRef<HTMLDivElement>(null)
  const [userIsScrolling, setUserIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      setUserIsScrolling(true)

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // After 2 seconds of no scrolling, assume user is done
      scrollTimeoutRef.current = setTimeout(() => {
        setUserIsScrolling(false)
      }, 2000)
    }

    container.addEventListener('scroll', handleScroll)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="bg-background border rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold mb-3 text-lg">{t('title')}</h3>
      <div
        ref={containerRef}
        className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
      >
        {events.length === 0 && (
          <p className="text-muted-foreground text-base py-8 text-center">
            {t('empty')}
          </p>
        )}
        {events.map((event, index) => (
          <div
            key={event.id}
            className="text-base border-b border-border pb-2 last:border-0 transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2"
            style={{
              animationDelay: index < 3 ? `${index * 50}ms` : '0ms',
              animationDuration: '300ms'
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {event.type === 'new' ? (
                  <span className="text-foreground">
                    <strong className="font-mono text-accent font-semibold">
                      {event.displayName}
                    </strong>{' '}
                    <span className="text-muted-foreground">{t('enteredFor')}</span>{' '}
                    <strong className="font-mono text-accent font-semibold">
                      €{event.bidEur.toFixed(2)}
                    </strong>
                  </span>
                ) : (
                  <span className="text-foreground">
                    <strong className="font-mono text-accent font-semibold">
                      {event.displayName}
                    </strong>{' '}
                    <span className="text-muted-foreground">{t('outbidFor')}</span>{' '}
                    <strong className="font-mono text-accent font-semibold">
                      €{event.bidEur.toFixed(2)}
                    </strong>
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                {formatDistanceToNow(event.timestamp, {
                  addSuffix: true,
                  locale: dateLocale
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
