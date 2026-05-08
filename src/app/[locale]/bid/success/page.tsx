'use client';

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function BidSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('bid.success');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
      } catch {
        // advisory — ignore
      }
    };
    fetchUserEmail();
  }, []);

  return (
    <div className="h-full w-full flex items-center justify-center bg-term-bg p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-term-surface border border-term-border-light font-mono overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-term-faint">
            <span className="text-term-accent text-sm">$ payment</span>
            <span className="text-term-dim text-xs">[confirmed]</span>
          </div>

          {/* Content */}
          <div className="p-5 space-y-6 bg-term-bg">
            {/* Status steps */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-term-muted">&gt; {t('statusProcessing')}</span>
                <span className="text-term-accent">[ok]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-term-muted">&gt; {t('statusVerifying')}</span>
                <span className="text-term-accent">[ok]</span>
              </div>
              <div className="text-term-accent">&gt; {t('statusConfirmed')}</div>
            </div>

            {/* Result messages */}
            <div className="space-y-1 text-sm text-term-muted pt-2 border-t border-term-faint">
              <div>&gt; {t('slotLive')}</div>
              {userEmail && (
                <div>&gt; {t('confirmationEmail', { email: userEmail })}</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="px-4 py-2 text-xs text-term-accent border border-term-accent hover:bg-term-accent/10 transition-colors"
              >
                [{t('viewBillboard')}]
              </button>
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="px-4 py-2 text-xs text-term-muted border border-term-border-light hover:text-white hover:border-term-accent transition-colors"
              >
                [{t('viewDashboard')}]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
