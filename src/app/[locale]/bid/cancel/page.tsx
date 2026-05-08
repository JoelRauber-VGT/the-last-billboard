'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function BidCancelPage() {
  const t = useTranslations('bid.cancel');
  const tErrors = useTranslations('errors');

  return (
    <div className="h-full w-full flex items-center justify-center bg-term-bg text-white font-mono p-6">
      <div className="max-w-md w-full border border-term-border-light bg-term-surface p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-term-faint pb-2">
          <span className="text-sm text-term-accent">$ payment</span>
          <span className="text-xs text-term-danger">[cancelled]</span>
        </div>

        <h1 className="text-lg text-term-text">&gt; {t('title')}</h1>

        <p className="text-sm text-term-muted leading-relaxed">
          &gt; {t('message')}
        </p>
        <p className="text-xs text-term-muted leading-relaxed">
          &gt; your payment was not completed. no charges were made.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Link
            href="/bid"
            className="flex-1 text-center px-3 py-2 text-xs text-term-accent border border-term-accent hover:bg-term-accent/10 transition-colors"
          >
            [{t('tryAgain')}]
          </Link>
          <Link
            href="/"
            className="flex-1 text-center px-3 py-2 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent transition-colors"
          >
            [{t('backToBillboard')}]
          </Link>
        </div>

        <div className="pt-3 border-t border-term-faint">
          <a
            href="mailto:support@thelastbillboard.com"
            className="text-[11px] text-term-muted hover:text-term-accent transition-colors"
          >
            &gt; {tErrors('contactSupport')}
          </a>
        </div>
      </div>
    </div>
  );
}
