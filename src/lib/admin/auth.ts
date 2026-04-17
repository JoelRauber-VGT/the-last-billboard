import { createServerClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

/**
 * Check if the current user is an admin
 * Returns 404 if not authenticated or not admin (to hide route existence)
 */
export async function requireAdmin(locale: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user) {
    redirect(`/${locale}/login?redirect=/admin`)
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single() as { data: { is_admin: boolean } | null }

  // Return 404 if not admin (to hide route existence)
  if (!profile || !profile.is_admin) {
    notFound()
  }

  return { user, supabase }
}

/**
 * Check if the current user is an admin (for API routes)
 * Returns null if not authenticated or not admin
 */
export async function checkAdminAuth() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single() as { data: { is_admin: boolean } | null }

  if (!profile || !profile.is_admin) {
    return null
  }

  return { user, supabase }
}
