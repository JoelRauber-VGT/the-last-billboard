'use client'

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  user: any;
  isAdmin: boolean;
  unreadNotifications?: number;
  onOpenRules?: () => void;
  onOpenAuth?: () => void;
}

export function Header({
  user,
  isAdmin,
  unreadNotifications = 0,
  onOpenRules,
  onOpenAuth,
}: HeaderProps) {
  const t = useTranslations('nav');

  return (
    <header className="sticky top-9 z-30 bg-term-bg py-4 px-6">
      <div className="flex items-center justify-between">
        {/* Left: Wordmark + Cursor */}
        <div className="flex items-center">
          <Link href="/" className="font-mono text-xl text-term-text hover:text-white transition-colors">
            the_last_billboard
          </Link>
          <span className="font-mono text-xl font-bold animate-[blink_1s_step-end_infinite]" style={{ color: '#60a5fa' }}>_</span>
        </div>

        {/* Right: Navigation */}
        <nav className="flex items-center gap-6 font-mono text-lg">
          <Link href="/leaderboard" className="text-term-text hover:text-white transition-colors">
            /{t('leaderboard')}
          </Link>
          <Link href="/about" className="text-term-text hover:text-white transition-colors">
            /{t('about')}
          </Link>

          {onOpenRules && (
            <button
              onClick={onOpenRules}
              className="text-term-text hover:text-white transition-colors focus:outline-none"
            >
              /{t('rules')}
            </button>
          )}

          <span className="text-term-faint">|</span>

          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="text-term-text hover:text-white transition-colors">
                  /{t('admin')}
                </Link>
              )}
              <Link
                href="/inbox"
                aria-label={t('inbox')}
                className="relative text-term-text hover:text-white transition-colors flex items-center"
              >
                <Inbox className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span
                    className="absolute -top-1 -right-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full"
                    style={{
                      background: '#60a5fa',
                      color: '#0a0a0a',
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                    }}
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
              <UserMenu user={user} />
              <Link href="/bid" style={{ color: '#60a5fa' }} className="hover:text-white transition-colors">
                [{t('bid')}]
              </Link>
            </>
          ) : (
            <>
              {onOpenAuth ? (
                <button
                  onClick={onOpenAuth}
                  className="text-term-text hover:text-white transition-colors focus:outline-none"
                >
                  {t('signIn')}
                </button>
              ) : (
                <Link href="/login" className="text-term-text hover:text-white transition-colors focus:outline-none">
                  {t('signIn')}
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
