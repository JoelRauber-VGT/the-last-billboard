'use client';

import { usePathname, useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
] as const;

interface LanguageSwitcherProps {
  variant?: 'full' | 'minimal';
}

export function LanguageSwitcher({ variant = 'full' }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  // Minimal variant for footer - simple inline links
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 font-mono text-sm">
        {languages.map((language, index) => (
          <span key={language.code}>
            {index > 0 && <span className="text-term-border-light mr-2">|</span>}
            <button
              onClick={() => handleLanguageChange(language.code)}
              className={`transition-colors ${
                locale === language.code
                  ? 'text-term-text font-bold'
                  : 'text-term-dim hover:text-term-muted'
              }`}
            >
              {language.code}
            </button>
          </span>
        ))}
      </div>
    );
  }

  // Full variant with dropdown - for other parts of the app
  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      {languages.map((language, index) => (
        <span key={language.code}>
          {index > 0 && <span className="text-term-border-light mr-2">|</span>}
          <button
            onClick={() => handleLanguageChange(language.code)}
            className={`transition-colors ${
              locale === language.code
                ? 'text-term-text font-bold'
                : 'text-term-dim hover:text-term-muted'
            }`}
          >
            {language.code}
          </button>
        </span>
      ))}
    </div>
  );
}
