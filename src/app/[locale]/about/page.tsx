import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    title: t('about.title'),
    description: t('about.description'),
    openGraph: {
      title: t('about.title'),
      description: t('about.description'),
      url: `${baseUrl}/${locale}/about`,
      siteName: 'The Last Billboard',
      images: [
        {
          url: `${baseUrl}/api/og`,
          width: 1200,
          height: 630,
          alt: 'The Last Billboard',
        },
      ],
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('about.title'),
      description: t('about.description'),
      images: [`${baseUrl}/api/og`],
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });

  return (
    <div className="w-full min-h-screen bg-term-bg py-16 px-6">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="font-mono text-2xl text-white mb-12">{t('title')}</h1>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 font-mono text-base leading-relaxed">
          {/* Left Column */}
          <div className="space-y-10">
            <section className="space-y-4">
              <h2 className="text-lg text-white">{t('concept.title')}</h2>
              <p className="text-term-text">{t('concept.text')}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg text-white">{t('howItWorks.title')}</h2>
              <ol className="space-y-3 list-decimal list-inside text-term-text">
                <li><strong className="text-white">{t('howItWorks.step1.title')}:</strong> {t('howItWorks.step1.text')}</li>
                <li><strong className="text-white">{t('howItWorks.step2.title')}:</strong> {t('howItWorks.step2.text')}</li>
                <li><strong className="text-white">{t('howItWorks.step3.title')}:</strong> {t('howItWorks.step3.text')}</li>
                <li><strong className="text-white">{t('howItWorks.step4.title')}:</strong> {t('howItWorks.step4.text')}</li>
                <li><strong className="text-white">{t('howItWorks.step5.title')}:</strong> {t('howItWorks.step5.text')}</li>
              </ol>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg text-white">{t('freeze.title')}</h2>
              <p className="text-term-text">{t('freeze.countdown')}</p>
              <p className="text-term-text">{t('freeze.permanent')}</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg text-white">{t('technology.title')}</h2>
              <p className="text-term-text">{t('technology.intro')}</p>
              <ul className="space-y-2 list-disc list-inside text-term-text">
                <li>{t('technology.nextjs')}</li>
                <li>{t('technology.supabase')}</li>
                <li>{t('technology.stripe')}</li>
                <li>{t('technology.vercel')}</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg text-white">{t('specifications.title')}</h2>
              <div className="border border-term-border-light bg-term-surface p-6 space-y-2 text-term-text text-base">
                <div>{t('specifications.canvasSize')}</div>
                <div>{t('specifications.maxImageSize')}</div>
                <div>{t('specifications.imageFormats')}</div>
                <div>{t('specifications.minBlockSize')}</div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-10">
            <section className="space-y-4">
              <h2 className="text-lg text-white">{t('pricing.title')}</h2>
              <div className="border border-term-border-light bg-term-surface p-6 space-y-3 text-term-text">
                <div className="flex justify-between text-base">
                  <span>minimum bid</span>
                  <span className="text-white">€1</span>
                </div>
                <div className="flex justify-between text-base">
                  <span>platform fee</span>
                  <span className="text-white">10%</span>
                </div>
                <div className="flex justify-between text-base">
                  <span>refund on displacement</span>
                  <span className="text-white">90%</span>
                </div>
                <div className="mt-4 pt-4 border-t border-term-faint text-term-muted text-base">
                  {t('pricing.example')}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg text-white">{t('faq.title')}</h2>
              <div className="space-y-4 text-term-text">
                <details className="group">
                  <summary className="cursor-pointer text-term-text hover:text-white transition-colors list-none text-base">
                    {t('faq.q1.question')}
                  </summary>
                  <p className="mt-2 pl-4 text-term-muted text-base leading-relaxed">{t('faq.q1.answer')}</p>
                </details>
                <details className="group">
                  <summary className="cursor-pointer text-term-text hover:text-white transition-colors list-none text-base">
                    {t('faq.q2.question')}
                  </summary>
                  <p className="mt-2 pl-4 text-term-muted text-base leading-relaxed">{t('faq.q2.answer')}</p>
                </details>
                <details className="group">
                  <summary className="cursor-pointer text-term-text hover:text-white transition-colors list-none text-base">
                    {t('faq.q3.question')}
                  </summary>
                  <p className="mt-2 pl-4 text-term-muted text-base leading-relaxed">{t('faq.q3.answer')}</p>
                </details>
                <details className="group">
                  <summary className="cursor-pointer text-term-text hover:text-white transition-colors list-none text-base">
                    {t('faq.q4.question')}
                  </summary>
                  <p className="mt-2 pl-4 text-term-muted text-base leading-relaxed">{t('faq.q4.answer')}</p>
                </details>
                <details className="group">
                  <summary className="cursor-pointer text-term-text hover:text-white transition-colors list-none text-base">
                    {t('faq.q5.question')}
                  </summary>
                  <p className="mt-2 pl-4 text-term-muted text-base leading-relaxed">{t('faq.q5.answer')}</p>
                </details>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg text-white">{t('philosophy.title')}</h2>
              <div className="border-l-2 border-term-border-light pl-4 text-term-text">
                {t('philosophy.text')}
              </div>
            </section>
          </div>
        </div>

        <section className="mt-12 text-center">
          <Link
            href="/"
            className="inline-block font-mono text-base text-term-accent hover:text-white transition-colors"
          >
            → claim your pixel [enter the grid]
          </Link>
        </section>
      </div>
    </div>
  );
}
