/**
 * Sentry integration hooks for error reporting
 * Only active when NEXT_PUBLIC_SENTRY_DSN is configured
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Initialize Sentry (placeholder for future integration)
 * Call this in the root layout or _app file
 */
export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // TODO: Initialize Sentry SDK when ready
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.init({
    //   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    //   environment: process.env.NODE_ENV,
    //   tracesSampleRate: 1.0,
    // });
    console.log('Sentry would be initialized with DSN');
  }
}

/**
 * Capture an error and send it to Sentry (or log it in development)
 * @param error - The error to capture
 * @param context - Additional context about the error
 */
export function captureError(error: Error | unknown, context?: ErrorContext) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // TODO: Send to Sentry when SDK is integrated
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.captureException(error, {
    //   contexts: { custom: context },
    // });
    console.error('[Sentry]', errorMessage, {
      stack: errorStack,
      context,
    });
  } else {
    // Development: log to console
    console.error('[Error]', errorMessage, {
      stack: errorStack,
      context,
    });
  }
}

/**
 * Capture a message (not an error) to Sentry
 * @param message - The message to capture
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext
) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // TODO: Send to Sentry when SDK is integrated
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.captureMessage(message, level);
    console.log(`[Sentry ${level.toUpperCase()}]`, message, context);
  } else {
    console.log(`[${level.toUpperCase()}]`, message, context);
  }
}

/**
 * Set user context for error tracking
 * @param user - User information
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // TODO: Set user context in Sentry
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.setUser(user);
    console.log('[Sentry] User context set:', user.id);
  }
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // TODO: Clear user context in Sentry
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.setUser(null);
    console.log('[Sentry] User context cleared');
  }
}
