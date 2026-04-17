import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function TermsPage() {
  const t = useTranslations('legal.terms');

  return (
    <div className="w-full bg-term-bg py-12 px-6">
      <div className="max-w-[720px] mx-auto font-mono text-base leading-relaxed space-y-8 text-term-text">

        <h1 className="text-xl text-white mb-8">{t('title')}</h1>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('acceptance.title')}</h2>
          <p>{t('acceptance.text')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('service.title')}</h2>
          <p>{t('service.description')}</p>
          <p>{t('service.freeze')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('account.title')}</h2>
          <p>{t('account.magicLink')}</p>
          <p>{t('account.responsibility')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('bidding.title')}</h2>
          <div className="space-y-2">
            <p><span className="text-white">{t('bidding.minimum.title')}:</span> {t('bidding.minimum.text')}</p>
            <p><span className="text-white">{t('bidding.commission.title')}:</span> {t('bidding.commission.text')}</p>
            <p><span className="text-white">{t('bidding.size.title')}:</span> {t('bidding.size.text')}</p>
            <p><span className="text-white">{t('bidding.displacement.title')}:</span> {t('bidding.displacement.text')}</p>
            <p><span className="text-white">{t('bidding.refund.title')}:</span> {t('bidding.refund.text')}</p>
            <p><span className="text-white">{t('bidding.final.title')}:</span> {t('bidding.final.text')}</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('content.title')}</h2>
          <p>{t('content.intro')}</p>
          <p className="text-white">{t('content.prohibitedTitle')}:</p>
          <div className="pl-4 space-y-1">
            <p>&gt; {t('content.prohibited.pornography')}</p>
            <p>&gt; {t('content.prohibited.violence')}</p>
            <p>&gt; {t('content.prohibited.hate')}</p>
            <p>&gt; {t('content.prohibited.malware')}</p>
            <p>&gt; {t('content.prohibited.copyright')}</p>
            <p>&gt; {t('content.prohibited.illegal')}</p>
            <p>&gt; {t('content.prohibited.spam')}</p>
          </div>
          <p>{t('content.removal')}</p>
          <p>{t('content.license')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('payment.title')}</h2>
          <p>{t('payment.stripe')}</p>
          <p>{t('payment.currency')}</p>
          <p>{t('payment.noChargebacks')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('liability.title')}</h2>
          <p>{t('liability.platform')}</p>
          <p>{t('liability.userContent')}</p>
          <p>{t('liability.payment')}</p>
          <p>{t('liability.noWarranty')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('indemnification.title')}</h2>
          <p>{t('indemnification.text')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('freeze.title')}</h2>
          <p>{t('freeze.permanent')}</p>
          <p>{t('freeze.noRefunds')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('termination.title')}</h2>
          <p>{t('termination.text')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('law.title')}</h2>
          <p>{t('law.text')}</p>
          <div className="mt-3 p-3 bg-term-surface border border-term-border-light">
            <p className="text-term-accent text-base mb-1">{t('law.todoTitle')}</p>
            <p className="text-term-muted text-base">{t('law.todoText')}</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('changes.title')}</h2>
          <p>{t('changes.text')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('severability.title')}</h2>
          <p>{t('severability.text')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-term-text text-lg">{t('contact.title')}</h2>
          <p>{t('contact.text')}</p>
          <p>
            <span className="text-white">{t('contact.emailLabel')}:</span>{' '}
            <a href="mailto:legal@example.com" className="text-term-accent hover:text-white transition-colors">
              legal@example.com
            </a>
          </p>
          <p>
            {t('contact.seeImprint')}{' '}
            <Link href="/legal/imprint" className="text-term-accent hover:text-white transition-colors">
              {t('contact.imprintLink')}
            </Link>
          </p>
          <p className="text-base text-term-dim mt-4">
            {t('contact.lastUpdated')}: April 16, 2026
          </p>
        </section>

      </div>
    </div>
  );
}
