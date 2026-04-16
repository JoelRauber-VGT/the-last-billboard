import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const t = useTranslations('landing');

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('hero.tagline')}
          </p>
          <Button asChild size="lg" className="text-base">
            <Link href="/dashboard">{t('hero.cta')}</Link>
          </Button>
        </div>
      </section>

      {/* Explanation Section */}
      <section className="border-t bg-secondary/30 px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            {t('explanation.title')}
          </h2>
          <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto">
            {t('explanation.text')}
          </p>
        </div>
      </section>

      {/* Preview Section */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="border-2 border-dashed border-muted rounded-lg aspect-video flex items-center justify-center bg-muted/10">
            <p className="text-muted-foreground text-center px-4">
              {t('preview.placeholder')}
            </p>
          </div>
        </div>
      </section>

      {/* Countdown Section */}
      <section className="border-t px-4 py-12 bg-accent/5">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4">{t('countdown.title')}</h3>
          <div className="font-mono text-4xl md:text-5xl font-bold text-accent">
            00:00:00:00
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Days : Hours : Minutes : Seconds
          </p>
        </div>
      </section>
    </div>
  );
}
