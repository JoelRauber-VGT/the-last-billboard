import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Body size caps. Webhook events can carry larger payloads (Stripe occasionally
// sends events with embedded objects); everything else is plain JSON and stays
// well under 100 KB in practice.
const DEFAULT_API_BODY_LIMIT = 100 * 1024; // 100 KB
const WEBHOOK_BODY_LIMIT = 1024 * 1024; // 1 MB

function isWebhookPath(pathname: string): boolean {
  return pathname.startsWith('/api/webhooks/');
}

/**
 * Same-origin check for state-changing API requests. Browsers always send
 * Origin on cross-origin POST/PUT/PATCH/DELETE, so requiring Origin to match
 * the request's own host blocks classic CSRF without a token table. Webhook
 * paths are exempt because external services (Stripe) don't send a matching
 * Origin and instead authenticate via signed payloads.
 */
function checkApiSecurity(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // Body-size guard runs for any method that can carry a body. Reject early
  // before the route handler parses anything.
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(contentLength)) {
      const limit = isWebhookPath(pathname)
        ? WEBHOOK_BODY_LIMIT
        : DEFAULT_API_BODY_LIMIT;
      if (contentLength > limit) {
        return NextResponse.json(
          { error: 'Request body too large' },
          { status: 413 },
        );
      }
    }
  }

  // CSRF guard: only mutating methods, and webhooks are exempt.
  if (!MUTATING_METHODS.has(method) || isWebhookPath(pathname)) {
    return null;
  }

  const requestOrigin = request.nextUrl.origin;
  const origin = request.headers.get('origin');

  if (origin) {
    if (origin !== requestOrigin) {
      return NextResponse.json(
        { error: 'Forbidden: cross-origin request blocked' },
        { status: 403 },
      );
    }
    return null;
  }

  // No Origin header — fall back to Referer. Browsers send one of the two
  // for any non-trivial cross-origin request; rejecting requests with neither
  // blocks tools that don't identify themselves and is acceptable for a
  // browser-first app.
  const referer = request.headers.get('referer');
  if (!referer) {
    return NextResponse.json(
      { error: 'Forbidden: missing origin' },
      { status: 403 },
    );
  }

  try {
    const refererOrigin = new URL(referer).origin;
    if (refererOrigin !== requestOrigin) {
      return NextResponse.json(
        { error: 'Forbidden: cross-origin request blocked' },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Forbidden: malformed referer' },
      { status: 403 },
    );
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes get the security guard only — they don't need next-intl rewrites
  // and they manage their own Supabase auth per-request.
  if (pathname.startsWith('/api/')) {
    const blocked = checkApiSecurity(request);
    if (blocked) return blocked;
    return NextResponse.next();
  }

  // First, update Supabase session
  const supabaseResponse = await updateSession(request);

  // Then, run next-intl middleware on the supabase response
  const response = intlMiddleware(request);

  // Copy Supabase cookies to the final response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
