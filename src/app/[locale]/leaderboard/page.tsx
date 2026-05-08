import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    title: t('leaderboard.title'),
    description: t('leaderboard.description'),
    openGraph: {
      title: t('leaderboard.title'),
      description: t('leaderboard.description'),
      url: `${baseUrl}/${locale}/leaderboard`,
      siteName: 'The Last Billboard',
      images: [{ url: `${baseUrl}/api/og`, width: 1200, height: 630, alt: 'The Last Billboard' }],
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('leaderboard.title'),
      description: t('leaderboard.description'),
      images: [`${baseUrl}/api/og`],
    },
  };
}

export interface LeaderboardUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string;
  total_spent: number;
  slots_won: number;
  currently_holding: number;
  highest_bid: number;
}

export interface LeaderboardAnonymousPool {
  total_spent: number;
  slots_won: number;
  currently_holding: number;
  highest_bid: number;
}

export interface LeaderboardStats {
  total_volume: number;
  total_bidders: number;
  active_bidders_24h: number;
  active_slots: number;
  highest_bid_ever: number;
}

interface LeaderboardPayload {
  users: LeaderboardUser[];
  anonymous_pool: LeaderboardAnonymousPool;
  stats: LeaderboardStats;
}

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('get_leaderboard');

  const payload: LeaderboardPayload = (!error && data)
    ? (data as unknown as LeaderboardPayload)
    : {
        users: [],
        anonymous_pool: { total_spent: 0, slots_won: 0, currently_holding: 0, highest_bid: 0 },
        stats: { total_volume: 0, total_bidders: 0, active_bidders_24h: 0, active_slots: 0, highest_bid_ever: 0 },
      };

  return (
    <LeaderboardClient
      locale={locale}
      users={payload.users}
      anonymousPool={payload.anonymous_pool}
      stats={payload.stats}
    />
  );
}
