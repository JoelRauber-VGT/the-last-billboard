import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function PrivacyPage() {
  const t = useTranslations('legal.privacy');

  return (
    <div className="container max-w-3xl py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('introduction.title')}</h2>
          <p className="text-muted-foreground leading-relaxed">{t('introduction.text')}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('dataCollection.title')}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">{t('dataCollection.intro')}</p>

          <h3 className="text-xl font-semibold mb-3">{t('dataCollection.personal.title')}</h3>
          <ul className="space-y-2 mb-4">
            <li className="text-muted-foreground">
              <strong>{t('dataCollection.personal.emailLabel')}:</strong>{' '}
              {t('dataCollection.personal.email')}
            </li>
            <li className="text-muted-foreground">
              <strong>{t('dataCollection.personal.paymentLabel')}:</strong>{' '}
              {t('dataCollection.personal.payment')}
            </li>
            <li className="text-muted-foreground">
              <strong>{t('dataCollection.personal.bidsLabel')}:</strong>{' '}
              {t('dataCollection.personal.bids')}
            </li>
            <li className="text-muted-foreground">
              <strong>{t('dataCollection.personal.imagesLabel')}:</strong>{' '}
              {t('dataCollection.personal.images')}
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">{t('dataCollection.automatic.title')}</h3>
          <ul className="space-y-2">
            <li className="text-muted-foreground">
              <strong>{t('dataCollection.automatic.cookiesLabel')}:</strong>{' '}
              {t('dataCollection.automatic.cookies')}
            </li>
            <li className="text-muted-foreground">
              <strong>{t('dataCollection.automatic.ipLabel')}:</strong>{' '}
              {t('dataCollection.automatic.ip')}
            </li>
            <li className="text-muted-foreground">
              <strong>{t('dataCollection.automatic.browserLabel')}:</strong>{' '}
              {t('dataCollection.automatic.browser')}
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('dataUsage.title')}</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">{t('dataUsage.intro')}</p>
          <ul className="space-y-2 list-disc list-inside">
            <li className="text-muted-foreground">{t('dataUsage.authentication')}</li>
            <li className="text-muted-foreground">{t('dataUsage.processing')}</li>
            <li className="text-muted-foreground">{t('dataUsage.display')}</li>
            <li className="text-muted-foreground">{t('dataUsage.moderation')}</li>
            <li className="text-muted-foreground">{t('dataUsage.legal')}</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('processors.title')}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">{t('processors.intro')}</p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Supabase (Backend & Database)</h3>
              <p className="text-muted-foreground leading-relaxed">{t('processors.supabase')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {t('processors.privacyPolicy')}
                </a>
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Stripe (Payment Processing)</h3>
              <p className="text-muted-foreground leading-relaxed">{t('processors.stripe')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {t('processors.privacyPolicy')}
                </a>
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Vercel (Hosting)</h3>
              <p className="text-muted-foreground leading-relaxed">{t('processors.vercel')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {t('processors.privacyPolicy')}
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('rights.title')}</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">{t('rights.intro')}</p>
          <div className="space-y-3">
            <div>
              <strong className="text-foreground">{t('rights.access.title')}:</strong>{' '}
              <span className="text-muted-foreground">{t('rights.access.text')}</span>
            </div>
            <div>
              <strong className="text-foreground">{t('rights.rectification.title')}:</strong>{' '}
              <span className="text-muted-foreground">{t('rights.rectification.text')}</span>
            </div>
            <div>
              <strong className="text-foreground">{t('rights.erasure.title')}:</strong>{' '}
              <span className="text-muted-foreground">{t('rights.erasure.text')}</span>
            </div>
            <div>
              <strong className="text-foreground">{t('rights.portability.title')}:</strong>{' '}
              <span className="text-muted-foreground">{t('rights.portability.text')}</span>
            </div>
            <div>
              <strong className="text-foreground">{t('rights.objection.title')}:</strong>{' '}
              <span className="text-muted-foreground">{t('rights.objection.text')}</span>
            </div>
            <div>
              <strong className="text-foreground">{t('rights.complaint.title')}:</strong>{' '}
              <span className="text-muted-foreground">{t('rights.complaint.text')}</span>
            </div>
          </div>
          <p className="mt-4 text-muted-foreground">
            {t('rights.contact')}{' '}
            <a
              href="mailto:privacy@example.com"
              className="underline hover:text-foreground font-medium"
            >
              privacy@example.com
            </a>
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-600 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              {t('rights.todoEmail')}
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('cookies.title')}</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">{t('cookies.essential')}</p>
          <ul className="space-y-2 mb-3">
            <li className="text-muted-foreground">
              <strong>{t('cookies.authLabel')}:</strong> {t('cookies.auth')}
            </li>
            <li className="text-muted-foreground">
              <strong>{t('cookies.preferencesLabel')}:</strong> {t('cookies.preferences')}
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed font-medium">{t('cookies.noTracking')}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('retention.title')}</h2>
          <p className="text-muted-foreground leading-relaxed">{t('retention.accounts')}</p>
          <p className="text-muted-foreground leading-relaxed mt-2">{t('retention.transactions')}</p>
          <p className="text-muted-foreground leading-relaxed mt-2">{t('retention.logs')}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('security.title')}</h2>
          <p className="text-muted-foreground leading-relaxed">{t('security.text')}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('international.title')}</h2>
          <p className="text-muted-foreground leading-relaxed">{t('international.text')}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{t('updates.title')}</h2>
          <p className="text-muted-foreground leading-relaxed">{t('updates.text')}</p>
          <p className="text-sm text-muted-foreground mt-4 font-medium">
            {t('updates.lastUpdated')}: April 16, 2026
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{t('contact.title')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('contact.text')}
          </p>
          <p className="mt-3 text-muted-foreground">
            <strong>{t('contact.emailLabel')}:</strong>{' '}
            <a
              href="mailto:privacy@example.com"
              className="underline hover:text-foreground font-medium"
            >
              privacy@example.com
            </a>
          </p>
          <p className="mt-2 text-muted-foreground">
            {t('contact.seeImprint')}{' '}
            <Link href="/legal/imprint" className="underline hover:text-foreground font-medium">
              {t('contact.imprintLink')}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
