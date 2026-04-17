import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    title: t('bid.title'),
    description: t('bid.description'),
    openGraph: {
      title: t('bid.title'),
      description: t('bid.description'),
      url: `${baseUrl}/${locale}/bid`,
      siteName: 'The Last Billboard',
      images: [
        {
          url: `${baseUrl}/api/og`,
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
      title: t('bid.title'),
      description: t('bid.description'),
      images: [`${baseUrl}/api/og`],
    },
  };
}

export default function BidLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-2xl">
        {children}
      </div>
    </div>
  );
}
