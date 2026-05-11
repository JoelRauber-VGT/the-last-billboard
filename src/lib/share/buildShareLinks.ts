export type ShareVariant = 'purchase' | 'outbid' | 'own'

export interface ShareContext {
  variant: ShareVariant
  displayName: string
  bidEur: number
  outbidName?: string
  slotId: string
  locale: string
  baseUrl: string
}

export interface ShareTexts {
  title: string
  body: string
  hashtags: string[]
}

export interface ShareTargets {
  url: string
  ogImageUrl: string
  twitter: string
  reddit: string
  facebook: string
  linkedin: string
  whatsapp: string
  telegram: string
  mailto: string
}

export function buildShareUrl(ctx: ShareContext): string {
  const u = new URL(`${ctx.baseUrl}/${ctx.locale}`)
  u.searchParams.set('slot', ctx.slotId)
  u.searchParams.set('utm_source', 'share')
  u.searchParams.set('utm_medium', 'social')
  u.searchParams.set('utm_campaign', ctx.variant)
  return u.toString()
}

export function buildOgImageUrl(ctx: ShareContext): string {
  return `${ctx.baseUrl}/api/og?slot=${encodeURIComponent(ctx.slotId)}&v=${ctx.variant}`
}

export function buildShareTargets(
  ctx: ShareContext,
  texts: ShareTexts
): ShareTargets {
  const url = buildShareUrl(ctx)
  const ogImageUrl = buildOgImageUrl(ctx)
  const text = texts.body
  const tags = texts.hashtags.join(',')

  const enc = encodeURIComponent

  return {
    url,
    ogImageUrl,
    twitter: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}${tags ? `&hashtags=${enc(tags)}` : ''}`,
    reddit: `https://www.reddit.com/submit?title=${enc(texts.title)}&url=${enc(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    whatsapp: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
    telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
    mailto: `mailto:?subject=${enc(texts.title)}&body=${enc(`${text}\n\n${url}`)}`,
  }
}
