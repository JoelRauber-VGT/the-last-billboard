import { getTranslations } from 'next-intl/server';
import { FullscreenBillboard } from '@/components/billboard/FullscreenBillboard';
import { createServerClient } from '@/lib/supabase/server';
import { isBillboardFrozenAsync } from '@/lib/freeze/getFreezeDate';
import type { Slot } from '@/types/database';
import type { Metadata } from 'next';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const rawSlot = typeof sp.slot === 'string' ? sp.slot : null;
  const variant = typeof sp.utm_campaign === 'string' ? sp.utm_campaign : 'purchase';
  const slotId = rawSlot && UUID_RE.test(rawSlot) ? rawSlot : null;

  const ogPath = slotId
    ? `/api/og?slot=${encodeURIComponent(slotId)}&v=${encodeURIComponent(variant)}`
    : `/api/og`;

  return {
    title: t('landing.title'),
    description: t('landing.description'),
    keywords: ['billboard', 'advertising', 'competition', 'digital space', 'final billboard', 'online advertising'],
    openGraph: {
      title: t('landing.title'),
      description: t('landing.description'),
      url: `${baseUrl}/${locale}${slotId ? `?slot=${slotId}` : ''}`,
      siteName: 'The Last Billboard',
      images: [
        {
          url: `${baseUrl}${ogPath}`,
          width: 1200,
          height: 630,
          alt: 'The Last Billboard',
        },
      ],
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('landing.title'),
      description: t('landing.description'),
      images: [`${baseUrl}${ogPath}`],
    },
  };
}

export default async function HomePage() {
  const t = await getTranslations('landing');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Fetch slots server-side for initial render
  let initialSlots: Slot[] = [];
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .eq('status', 'active')
      .order('current_bid_eur', { ascending: false });

    if (!error && data) {
      initialSlots = data;
    }
  } catch (error) {
    console.error('Failed to fetch initial slots:', error);
  }

  const frozen = await isBillboardFrozenAsync();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'The Last Billboard',
    description: 'The final advertising space on the internet',
    url: baseUrl,
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '1.00',
      priceCurrency: 'EUR',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      {/* Fullscreen Billboard Hero */}
      <FullscreenBillboard
        initialSlots={initialSlots}
        isFrozen={frozen}
      />
    </>
  );
}
