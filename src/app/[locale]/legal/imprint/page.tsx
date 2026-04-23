import { useTranslations } from 'next-intl';
import { config } from '@/lib/config';

export default function ImprintPage() {
  const t = useTranslations('legal.imprint');
  const legal = config.legal;

  const hasOperator =
    legal.operatorName.length > 0 || legal.operatorAddress.length > 0;
  const contactEmail = legal.contactEmail || legal.legalEmail;

  return (
    <div className="container max-w-3xl py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>

      <section className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-3">{t('operator.title')}</h2>

          {hasOperator ? (
            <div className="text-muted-foreground space-y-1">
              {legal.operatorName && <p className="font-medium text-foreground">{legal.operatorName}</p>}
              {legal.operatorAddress &&
                legal.operatorAddress.split('\n').map((line, i) => <p key={i}>{line}</p>)}
              {legal.operatorPhone && (
                <p>
                  <strong>{t('operator.todoItems.phone')}:</strong> {legal.operatorPhone}
                </p>
              )}
              {legal.operatorVat && (
                <p>
                  <strong>{t('operator.todoItems.vat')}:</strong> {legal.operatorVat}
                </p>
              )}
              {legal.operatorRegister && (
                <p>
                  <strong>{t('operator.todoItems.register')}:</strong> {legal.operatorRegister}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">
                {t('operator.placeholder')}
              </p>
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-lg">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  {t('operator.todoTitle')}
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1.5 ml-4">
                  <li className="list-disc">{t('operator.todoItems.name')}</li>
                  <li className="list-disc">{t('operator.todoItems.address')}</li>
                  <li className="list-disc">{t('operator.todoItems.email')}</li>
                  <li className="list-disc">{t('operator.todoItems.phone')}</li>
                  <li className="list-disc">{t('operator.todoItems.vat')}</li>
                  <li className="list-disc">{t('operator.todoItems.register')}</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">{t('contact.title')}</h2>
          {contactEmail ? (
            <p className="text-muted-foreground">
              <strong>{t('contact.emailLabel')}:</strong>{' '}
              <a href={`mailto:${contactEmail}`} className="underline hover:text-foreground">
                {contactEmail}
              </a>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('contact.placeholder')}
            </p>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">{t('disclaimer.title')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('disclaimer.liability')}
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            {t('disclaimer.externalLinks')}
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            {t('disclaimer.copyright')}
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">{t('disputeResolution.title')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('disputeResolution.text')}
          </p>
        </div>
      </section>
    </div>
  );
}
