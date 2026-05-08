'use client'

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function calcAt(endMs: number): Remaining {
  const diff = endMs - Date.now();
  const clamped = Math.max(0, diff);
  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped % 86_400_000) / 3_600_000),
    minutes: Math.floor((clamped % 3_600_000) / 60_000),
    seconds: Math.floor((clamped % 60_000) / 1000),
    totalMs: clamped,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

interface FooterProps {
  freezeDateIso: string;
}

export function Footer({ freezeDateIso }: FooterProps) {
  const t = useTranslations('footer');
  const endMs = new Date(freezeDateIso).getTime();
  const [mounted, setMounted] = useState(false);
  const [r, setR] = useState<Remaining>(() => calcAt(endMs));

  useEffect(() => {
    setMounted(true);
    setR(calcAt(endMs));
    const id = setInterval(() => {
      if (document.hidden) return;
      setR(calcAt(endMs));
    }, 1000);
    return () => clearInterval(id);
  }, [endMs]);

  const expired = mounted && r.totalMs <= 0;
  const underHour = !expired && r.totalMs > 0 && r.totalMs < 3_600_000;
  const underTenMin = !expired && r.totalMs > 0 && r.totalMs < 600_000;

  const dotColor = expired ? '#ef4444' : underHour ? '#ef4444' : '#60a5fa';
  const labelColor = expired ? '#ef4444' : underHour ? '#ef4444' : '#60a5fa';

  return (
    <footer className="bg-term-bg mt-auto">
      <div className="px-6 py-3 flex items-center justify-between font-mono text-base">
        {/* Left: Language switcher */}
        <div>
          <LanguageSwitcher variant="minimal" />
        </div>

        {/* Center: Live status + countdown to freeze */}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2 h-2 rounded-full ${underTenMin ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: dotColor }}
          />
          <span style={{ color: labelColor }}>
            {expired ? t('ended') : t('live')}
          </span>
          {!expired && (
            <>
              <span className="text-term-border-light">·</span>
              <span className="text-term-muted">{t('endsIn')}</span>
              <span
                className={`tabular-nums ${underHour ? 'text-red-500 font-semibold' : 'text-white'} ${underTenMin ? 'animate-pulse' : ''}`}
                aria-live="polite"
                suppressHydrationWarning
              >
                {mounted
                  ? `${r.days}d ${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`
                  : '--d --:--:--'}
              </span>
            </>
          )}
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
