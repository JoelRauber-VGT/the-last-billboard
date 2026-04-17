import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirect = requestUrl.searchParams.get('redirect') || '/dashboard'

  if (code) {
    const supabase = await createServerActionClient()

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      // Redirect to login with error
      return NextResponse.redirect(new URL(`/${locale}/login?error=auth_failed`, request.url))
    }

    // Call ensure-admin API to handle first-user-is-admin logic
    try {
      await fetch(new URL(`/api/auth/ensure-admin`, request.url).toString(), {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      })
    } catch (err) {
      console.error('Error calling ensure-admin:', err)
      // Don't fail the login if this fails
    }

    // Successful authentication, redirect to intended destination
    return NextResponse.redirect(new URL(`/${locale}${redirect}`, request.url))
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
}
