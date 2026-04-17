'use client'

import { useLiveTicker } from '@/hooks/useLiveTicker'

export function Tickertape() {
  const { events } = useLiveTicker(20)

  // Format events for ticker display
  const tickerItems = events.map((event) => {
    if (event.type === 'new') {
      return { text: `${event.displayName} bought ${event.bidEur.toFixed(0)}px for €${event.bidEur.toFixed(0)}`, type: 'new' }
    } else {
      return { text: `${event.displayName} outbid`, type: 'outbid' }
    }
  })

  // Duplicate items for seamless loop
  const duplicatedItems = [...tickerItems, ...tickerItems, ...tickerItems]

  return (
    <div className="bg-term-black h-9 overflow-hidden border-b border-term-border flex items-center">
      <div className="flex gap-10 whitespace-nowrap animate-[ticker_40s_linear_infinite]">
        {duplicatedItems.map((item, index) => (
          <span key={index} className="font-mono text-sm flex items-center gap-2">
            <span style={{ color: item.type === 'new' ? '#4ade80' : '#f87171' }}>
              {item.type === 'new' ? '▲' : '▼'}
            </span>
            <span className="text-term-text">{item.text}</span>
            <span className="text-term-border-light ml-8">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
