'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import type {
  LeaderboardUser,
  LeaderboardAnonymousPool,
  LeaderboardStats,
} from '@/app/[locale]/leaderboard/page';

type SortMode = 'spent' | 'wins';

interface Props {
  locale: string;
  users: LeaderboardUser[];
  anonymousPool: LeaderboardAnonymousPool;
  stats: LeaderboardStats;
}

function formatEUR(locale: string, amount: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatInt(locale: string, n: number): string {
  return new Intl.NumberFormat(locale).format(n);
}

function formatJoinedDate(locale: string, iso: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 7);
  }
}

function Avatar({ url, name, size = 48 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover border border-term-border-light"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = (name || '?').slice(0, 1).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-mono text-white border border-term-border-light bg-term-surface"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export function LeaderboardClient({ locale, users, anonymousPool, stats }: Props) {
  const t = useTranslations('leaderboard');
  const [mode, setMode] = useState<SortMode>('spent');

  const sortedUsers = useMemo(() => {
    const arr = [...users];
    if (mode === 'spent') {
      arr.sort((a, b) =>
        b.total_spent - a.total_spent ||
        b.slots_won - a.slots_won ||
        a.joined_at.localeCompare(b.joined_at)
      );
    } else {
      arr.sort((a, b) =>
        b.slots_won - a.slots_won ||
        b.total_spent - a.total_spent ||
        a.joined_at.localeCompare(b.joined_at)
      );
    }
    return arr;
  }, [users, mode]);

  const top3 = sortedUsers.slice(0, 3);
  const rest = sortedUsers.slice(3);

  const showAnonPool = anonymousPool.total_spent > 0 || anonymousPool.slots_won > 0;

  return (
    <div className="w-full min-h-screen bg-term-bg py-12 px-6">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="font-mono text-2xl text-white mb-2">{t('title')}</h1>
        <p className="font-mono text-base text-term-muted mb-10">{t('subtitle')}</p>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          <StatCell label={t('stats.totalVolume')} value={`€${formatEUR(locale, stats.total_volume)}`} />
          <StatCell label={t('stats.totalBidders')} value={formatInt(locale, stats.total_bidders)} />
          <StatCell
            label={t('stats.activeBidders24h')}
            value={formatInt(locale, stats.active_bidders_24h)}
            accent
          />
          <StatCell label={t('stats.activeSlots')} value={formatInt(locale, stats.active_slots)} />
          <StatCell label={t('stats.highestBidEver')} value={`€${formatEUR(locale, stats.highest_bid_ever)}`} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 font-mono text-base border-b border-term-border-light">
          <TabButton active={mode === 'spent'} onClick={() => setMode('spent')}>
            {t('tabs.topSpenders')}
          </TabButton>
          <TabButton active={mode === 'wins'} onClick={() => setMode('wins')}>
            {t('tabs.mostWins')}
          </TabButton>
        </div>

        {sortedUsers.length === 0 ? (
          <div className="border border-term-border-light bg-term-surface p-10 text-center font-mono text-term-muted">
            {t('empty')}
          </div>
        ) : (
          <>
            {/* Podium */}
            <Podium top3={top3} mode={mode} locale={locale} t={t} />

            {/* Rest list */}
            {rest.length > 0 && (
              <div className="mt-12 border border-term-border-light bg-term-surface">
                <div className="hidden md:grid grid-cols-[60px_1fr_140px_100px_100px_140px_140px] gap-4 px-5 py-3 border-b border-term-border-light font-mono text-sm text-term-muted uppercase tracking-wide">
                  <div>{t('columns.rank')}</div>
                  <div>{t('columns.user')}</div>
                  <div className="text-right">{t('columns.spent')}</div>
                  <div className="text-right">{t('columns.won')}</div>
                  <div className="text-right">{t('columns.holding')}</div>
                  <div className="text-right">{t('columns.highestBid')}</div>
                  <div className="text-right">{t('columns.joined')}</div>
                </div>
                {rest.map((user, idx) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    rank={idx + 4}
                    locale={locale}
                    mode={mode}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Anonymous pool */}
            {showAnonPool && (
              <div className="mt-6 border border-term-border-light bg-term-surface px-5 py-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="rounded-full flex items-center justify-center font-mono text-white border border-term-border-light"
                      style={{ width: 48, height: 48, background: '#1a1a1a', fontSize: 18 }}
                    >
                      ??
                    </div>
                    <div>
                      <div className="font-mono text-base text-white">{t('anonymousPool.name')}</div>
                      <div className="font-mono text-sm text-term-muted">{t('anonymousPool.description')}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm">
                    <PoolStat label={t('columns.spent')} value={`€${formatEUR(locale, anonymousPool.total_spent)}`} />
                    <PoolStat label={t('columns.won')} value={formatInt(locale, anonymousPool.slots_won)} />
                    <PoolStat label={t('columns.holding')} value={formatInt(locale, anonymousPool.currently_holding)} />
                    <PoolStat label={t('columns.highestBid')} value={`€${formatEUR(locale, anonymousPool.highest_bid)}`} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/bid"
            className="inline-block font-mono text-base text-term-accent hover:text-white transition-colors"
          >
            → {t('cta')}
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-term-border-light bg-term-surface p-4">
      <div className="font-mono text-xs uppercase tracking-wide text-term-muted">{label}</div>
      <div
        className="font-mono text-lg mt-1"
        style={{ color: accent ? '#60a5fa' : '#fff' }}
      >
        {value}
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 transition-colors focus:outline-none border-b-2 -mb-px"
      style={{
        color: active ? '#fff' : 'var(--color-term-muted)',
        borderColor: active ? '#60a5fa' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

function PoolStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-term-muted">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  );
}

interface PodiumProps {
  top3: LeaderboardUser[];
  mode: SortMode;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}

function Podium({ top3, mode, locale, t }: PodiumProps) {
  // Display order: 2nd, 1st, 3rd. On mobile we collapse to 1, 2, 3 vertically.
  const slots: Array<{ user: LeaderboardUser | undefined; rank: 1 | 2 | 3 }> = [
    { user: top3[1], rank: 2 },
    { user: top3[0], rank: 1 },
    { user: top3[2], rank: 3 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-end">
      {slots.map(({ user, rank }) => (
        <PodiumCard
          key={rank}
          user={user}
          rank={rank}
          mode={mode}
          locale={locale}
          t={t}
        />
      ))}
    </div>
  );
}

function PodiumCard({
  user,
  rank,
  mode,
  locale,
  t,
}: {
  user: LeaderboardUser | undefined;
  rank: 1 | 2 | 3;
  mode: SortMode;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!user) {
    return (
      <div
        className="border border-dashed border-term-faint bg-term-bg p-6 flex flex-col items-center justify-center font-mono text-term-dim"
        style={{ minHeight: rank === 1 ? 280 : 220 }}
      >
        <div className="text-4xl mb-2">{rank === 1 ? '#1' : rank === 2 ? '#2' : '#3'}</div>
        <div className="text-sm">{t('podium.openSlot')}</div>
      </div>
    );
  }

  const colors: Record<1 | 2 | 3, string> = {
    1: '#fbbf24', // gold
    2: '#cbd5e1', // silver
    3: '#d97706', // bronze
  };
  const accent = colors[rank];
  const sizeClass = rank === 1 ? 'md:py-10' : 'md:py-7';
  const minH = rank === 1 ? 280 : 220;
  const avatarSize = rank === 1 ? 96 : 72;

  const primary = mode === 'spent'
    ? `€${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(user.total_spent)}`
    : `${new Intl.NumberFormat(locale).format(user.slots_won)} ${t('podium.winsSuffix')}`;
  const secondary = mode === 'spent'
    ? `${new Intl.NumberFormat(locale).format(user.slots_won)} ${t('podium.winsSuffix')}`
    : `€${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(user.total_spent)}`;

  return (
    <Link
      href={`/profile/${user.id}` as any}
      className={`relative border bg-term-surface p-6 flex flex-col items-center text-center font-mono transition-colors hover:border-white ${sizeClass}`}
      style={{ borderColor: accent, minHeight: minH }}
    >
      <div
        className="absolute top-0 left-0 right-0 text-center py-1 text-sm font-bold"
        style={{ background: accent, color: '#0a0a0a' }}
      >
        #{rank}
      </div>
      <div className="mt-6 mb-3">
        <Avatar url={user.avatar_url} name={user.display_name || '?'} size={avatarSize} />
      </div>
      <div className="text-base text-white truncate max-w-full">
        {user.display_name || t('podium.unnamed')}
      </div>
      <div className="text-xs text-term-muted mb-3">
        {t('podium.joined')} {formatJoinedDate(locale, user.joined_at)}
      </div>
      <div className="text-xl mt-auto" style={{ color: accent }}>
        {primary}
      </div>
      <div className="text-xs text-term-muted mt-1">{secondary}</div>
      <div className="grid grid-cols-2 gap-2 w-full mt-4 pt-4 border-t border-term-faint text-xs">
        <div>
          <div className="text-term-muted">{t('columns.holding')}</div>
          <div className="text-white">{formatInt(locale, user.currently_holding)}</div>
        </div>
        <div>
          <div className="text-term-muted">{t('columns.highestBid')}</div>
          <div className="text-white">€{formatEUR(locale, user.highest_bid)}</div>
        </div>
      </div>
    </Link>
  );
}

function UserRow({
  user,
  rank,
  locale,
  mode,
  t,
}: {
  user: LeaderboardUser;
  rank: number;
  locale: string;
  mode: SortMode;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Link
      href={`/profile/${user.id}` as any}
      className="block px-5 py-4 border-b border-term-border last:border-b-0 hover:bg-term-bg transition-colors font-mono"
    >
      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-[60px_1fr_140px_100px_100px_140px_140px] gap-4 items-center text-sm">
        <div className="text-term-muted">#{rank}</div>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar url={user.avatar_url} name={user.display_name || '?'} size={32} />
          <span className="text-white truncate">{user.display_name || t('podium.unnamed')}</span>
        </div>
        <div
          className="text-right"
          style={{ color: mode === 'spent' ? '#60a5fa' : '#fff' }}
        >
          €{formatEUR(locale, user.total_spent)}
        </div>
        <div
          className="text-right"
          style={{ color: mode === 'wins' ? '#60a5fa' : '#fff' }}
        >
          {formatInt(locale, user.slots_won)}
        </div>
        <div className="text-right text-white">{formatInt(locale, user.currently_holding)}</div>
        <div className="text-right text-white">€{formatEUR(locale, user.highest_bid)}</div>
        <div className="text-right text-term-muted">{formatJoinedDate(locale, user.joined_at)}</div>
      </div>

      {/* Mobile stack */}
      <div className="md:hidden">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-term-muted text-sm w-10">#{rank}</span>
          <Avatar url={user.avatar_url} name={user.display_name || '?'} size={32} />
          <span className="text-white truncate flex-1">{user.display_name || t('podium.unnamed')}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pl-13 text-xs">
          <div>
            <span className="text-term-muted">{t('columns.spent')}: </span>
            <span className="text-white">€{formatEUR(locale, user.total_spent)}</span>
          </div>
          <div>
            <span className="text-term-muted">{t('columns.won')}: </span>
            <span className="text-white">{formatInt(locale, user.slots_won)}</span>
          </div>
          <div>
            <span className="text-term-muted">{t('columns.holding')}: </span>
            <span className="text-white">{formatInt(locale, user.currently_holding)}</span>
          </div>
          <div>
            <span className="text-term-muted">{t('columns.highestBid')}: </span>
            <span className="text-white">€{formatEUR(locale, user.highest_bid)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
