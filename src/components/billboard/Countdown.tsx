'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { config } from '@/lib/config';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(): TimeRemaining {
  const now = new Date().getTime();
  const end = config.billboardEndsAt.getTime();
  const diff = end - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    isExpired: false
  };
}

export function Countdown() {
  const t = useTranslations('countdown');
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(calculateTimeRemaining());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const interval = setInterval(() => {
      // Pause countdown when tab is not visible (performance)
      if (document.hidden) return;

      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
        <div className="font-mono text-4xl">--:--:--:--</div>
      </div>
    );
  }

  if (timeRemaining.isExpired) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
        <div className="font-mono text-4xl text-accent">{t('frozen')}</div>
        <p className="text-base text-muted-foreground mt-2">{t('frozenMessage')}</p>
      </div>
    );
  }

  const isUnderOneHour = timeRemaining.days === 0 && timeRemaining.hours === 0;
  const isUnderTenMinutes = isUnderOneHour && timeRemaining.minutes < 10;

  return (
    <div className="text-center py-6 md:py-8">
      <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">{t('title')}</h3>
      <div
        className={`font-mono text-2xl sm:text-3xl md:text-4xl lg:text-5xl ${
          isUnderOneHour ? 'text-red-500' : 'text-foreground'
        } ${isUnderTenMinutes ? 'animate-pulse' : ''}`}
      >
        <span>{String(timeRemaining.days).padStart(2, '0')}</span>
        <span className="text-muted-foreground">:</span>
        <span>{String(timeRemaining.hours).padStart(2, '0')}</span>
        <span className="text-muted-foreground">:</span>
        <span>{String(timeRemaining.minutes).padStart(2, '0')}</span>
        <span className="text-muted-foreground">:</span>
        <span>{String(timeRemaining.seconds).padStart(2, '0')}</span>
      </div>
      <div className="text-sm text-muted-foreground mt-2 space-x-2 sm:space-x-4">
        <span>{t('days')}</span>
        <span>{t('hours')}</span>
        <span>{t('minutes')}</span>
        <span>{t('seconds')}</span>
      </div>
      {isUnderOneHour && (
        <p className="text-base text-red-500 mt-3 md:mt-4 font-semibold px-4">{t('urgentWarning')}</p>
      )}
    </div>
  );
}
