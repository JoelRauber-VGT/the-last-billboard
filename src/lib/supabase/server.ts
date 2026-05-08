import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Create a Supabase client for Server Components
 * Use this in Server Components where you only need to read data
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  // Type parameter temporarily removed - will be added back when types are fully configured
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Service-role client for internal server-side mutations that must bypass
 * RLS (e.g. writing stripe_session_id back to a transaction the user just
 * created — the user-auth client cannot UPDATE transactions by policy).
 * Never expose this client's results to a user-bound code path that should
 * be RLS-restricted.
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // service-role client has no session; cookies are a no-op
        },
      },
    }
  )
}

/**
 * Create a Supabase client for Server Actions
 * Use this in Server Actions and Route Handlers where you need to mutate data
 */
export async function createServerActionClient() {
  const cookieStore = await cookies()

  // Type parameter temporarily removed - will be added back when types are fully configured
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
