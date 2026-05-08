'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations('legal.cookieBanner');

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-term-surface border-t border-term-border z-50 font-mono">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-term-muted leading-relaxed flex-1">
            &gt; {t('message')}{' '}
            <Link
              href="/legal/privacy"
              className="underline hover:text-white transition-colors"
            >
              {t('learnMore')}
            </Link>
          </p>
          <button
            onClick={handleAccept}
            className="shrink-0 px-4 py-1.5 text-xs text-term-accent border border-term-accent hover:bg-term-accent/10 transition-colors"
          >
            [{t('accept')}]
          </button>
        </div>
      </div>
    </div>
  );
}
