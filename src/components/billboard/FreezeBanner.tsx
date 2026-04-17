'use client';

import { isBillboardFrozen } from '@/lib/freeze/checkFrozen';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';

export function FreezeBanner() {
  const t = useTranslations('freeze');
  const frozen = isBillboardFrozen();

  if (!frozen) return null;

  return (
    <div className="bg-accent/10 border-accent border rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-accent">{t('title')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('message')}</p>
          <p className="text-xs text-muted-foreground mt-2">{t('linksStillWork')}</p>
        </div>
      </div>
    </div>
  );
}
