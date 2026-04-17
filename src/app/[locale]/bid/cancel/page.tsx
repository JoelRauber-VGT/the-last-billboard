'use client';

import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { XCircle, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BidCancelPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('bid.cancel');
  const tErrors = useTranslations('errors');

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 md:py-16">
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-yellow-100 p-4">
              <XCircle className="size-16 text-yellow-600" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl text-yellow-900">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-base text-yellow-800 mt-2">
            {t('message')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white/70 border border-yellow-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-yellow-900">
              Your payment was not completed. No charges have been made to your account.
            </p>
            <p className="text-sm text-yellow-900">
              You can try again or return to the billboard to browse other options.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => router.push(`/${locale}/bid`)}
              className="flex-1"
              size="lg"
            >
              {t('tryAgain')}
            </Button>
            <Button
              onClick={() => router.push(`/${locale}`)}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              {t('backToBillboard')}
            </Button>
          </div>
          <div className="pt-2 border-t border-yellow-200">
            <a
              href="mailto:support@thelastbillboard.com"
              className="flex items-center justify-center gap-2 text-sm text-yellow-700 hover:text-yellow-900 transition-colors"
            >
              <HelpCircle className="size-4" />
              {tErrors('contactSupport')}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
