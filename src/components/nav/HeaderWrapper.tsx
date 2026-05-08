import { createServerClient } from '@/lib/supabase/server';
import { Header } from './Header';
import { unstable_noStore as noStore } from 'next/cache';

interface HeaderWrapperProps {
  onOpenRules?: () => void;
  onOpenAuth?: () => void;
}

export async function HeaderWrapper({ onOpenRules, onOpenAuth }: HeaderWrapperProps) {
  // Disable caching for this component to always fetch fresh profile data
  noStore();

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  let displayName = null;
  let unreadNotifications = 0;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, display_name')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.is_admin || false;
    displayName = profile?.display_name || null;

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);
    unreadNotifications = count ?? 0;
  }

  // Extend user object with display_name
  const userWithProfile = user ? { ...user, display_name: displayName } : null;

  return (
    <Header
      user={userWithProfile}
      isAdmin={isAdmin}
      unreadNotifications={unreadNotifications}
      onOpenRules={onOpenRules}
      onOpenAuth={onOpenAuth}
    />
  );
}
