'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 animate-in slide-in-from-bottom duration-300">
      <div className="container max-w-5xl px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('message')}{' '}
              <Link
                href="/legal/privacy"
                className="underline hover:text-foreground font-medium"
              >
                {t('learnMore')}
              </Link>
            </p>
          </div>
          <Button onClick={handleAccept} size="sm" className="shrink-0">
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
