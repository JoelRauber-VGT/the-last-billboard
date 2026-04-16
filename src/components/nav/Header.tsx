import { createServerClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LogOut } from 'lucide-react';

export async function Header() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations('nav');

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
    <header className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
              The Last Billboard
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link
                href="/about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('about')}
              </Link>
              {user && (
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('dashboard')}
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('admin')}
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {user ? (
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('logout')}
                </Button>
              </form>
            ) : (
              <Button asChild size="sm">
                <Link href="/auth/login">{t('login')}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
