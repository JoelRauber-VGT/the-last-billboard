import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from './LanguageSwitcher';

export async function Footer() {
  const t = await getTranslations();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <nav className="flex gap-6">
              <Link
                href="/about"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav.about')}
              </Link>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.legal')}
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('footer.privacy')}
              </a>
            </nav>
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} The Last Billboard
            </p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
