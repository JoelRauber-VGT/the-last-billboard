'use client'

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Footer() {
  const t = useTranslations('footer');

  // Calculate uptime from launch date (example: April 1, 2026)
  const launchDate = new Date('2026-04-01');
  const now = new Date();
  const diffMs = now.getTime() - launchDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <footer className="bg-term-bg mt-auto">
      <div className="px-6 py-3 flex items-center justify-between font-mono text-base">
        {/* Left: Language switcher */}
        <div>
          <LanguageSwitcher variant="minimal" />
        </div>

        {/* Center: Live status */}
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#60a5fa' }} />
          <span style={{ color: '#60a5fa' }}>{t('live')}</span>
          <span className="text-term-border-light">·</span>
          <span className="text-term-muted">{t('uptime')} {days}d {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}</span>
        </div>

        {/* Right: Legal links */}
        <div className="flex items-center gap-5">
          <Link href="/legal/terms" className="text-term-dim hover:text-term-muted transition-colors">
            /{t('terms')}
          </Link>
          <Link href="/legal/contact" className="text-term-dim hover:text-term-muted transition-colors">
            /{t('contact')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
