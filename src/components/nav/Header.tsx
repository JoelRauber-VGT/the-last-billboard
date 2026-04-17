'use client'

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  user: any;
  isAdmin: boolean;
  onOpenRules?: () => void;
  onOpenAuth?: () => void;
}

export function Header({ user, isAdmin, onOpenRules, onOpenAuth }: HeaderProps) {
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
