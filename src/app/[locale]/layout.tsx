import type { Metadata } from 'next';
import { Inter, Space_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Toaster } from 'sonner';
import { routing } from '@/i18n/routing';
import { createServerClient } from '@/lib/supabase/server';
import { Tickertape } from '@/components/layout/Tickertape';
import { LayoutClient } from '@/components/layout/LayoutClient';
import { Footer } from '@/components/nav/Footer';
import { CookieBanner } from '@/components/legal/CookieBanner';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    title: {
      default: 'The Last Billboard',
      template: '%s | The Last Billboard',
    },
    description: 'The final advertising space. Compete for visibility. Winner takes all.',
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'en': `${baseUrl}/en`,
        'de': `${baseUrl}/de`,
        'fr': `${baseUrl}/fr`,
        'es': `${baseUrl}/es`,
      },
    },
  };
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  // Get user data for Header
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.is_admin || false;
  }

  return (
    <html lang={locale} className={`${inter.variable} ${spaceMono.variable}`}>
      <body className="h-screen flex flex-col font-mono antialiased bg-term-bg text-white overflow-hidden">
        <NextIntlClientProvider messages={messages}>
          <Tickertape />
          <LayoutClient user={user} isAdmin={isAdmin}>
            {children}
          </LayoutClient>
          <Footer />
          <CookieBanner />
          <Toaster position="top-right" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
