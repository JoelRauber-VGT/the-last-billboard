'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LogoutButton } from './LogoutButton';
import type { User } from '@supabase/supabase-js';

interface MobileNavProps {
  user: User | null;
  isAdmin: boolean;
}

export function MobileNav({ user, isAdmin }: MobileNavProps) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-6">
          <Link
            href="/about"
            className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => setOpen(false)}
          >
            {t('about')}
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setOpen(false)}
            >
              {t('dashboard')}
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setOpen(false)}
            >
              {t('admin')}
            </Link>
          )}

          <div className="border-t pt-4 mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Language</span>
              <LanguageSwitcher />
            </div>

            {user ? (
              <div className="space-y-3">
                <Link href="/bid" className="block" onClick={() => setOpen(false)}>
                  <Button className="w-full" variant="default">
                    {t('placeBid')}
                  </Button>
                </Link>
                <LogoutButton />
              </div>
            ) : (
              <Link href="/login" className="block" onClick={() => setOpen(false)}>
                <Button className="w-full">{t('login')}</Button>
              </Link>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
