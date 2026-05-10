import { NextResponse } from 'next/server';
import { captureError } from './sentry';

/**
 * Central server-side error helper for API routes.
 *
 * Returns a JSON response that ONLY contains a stable error code and a generic
 * human-readable label — never the underlying error message, stack, DB driver
 * details, or any other server-internal information. This avoids leaking
 * implementation details (Postgres error codes, internal paths, library
 * messages) to clients while still giving the frontend a stable code to
 * branch on for i18n / UX.
 *
 * The full error / cause is logged server-side via console.error with a
 * consistent `[api-error]` prefix and structured payload, AND forwarded to
 * Sentry (when configured) with route + code as tags so operators have
 * everything they need for debugging.
 *
 * Usage:
 *   } catch (error) {
 *     return apiError('refund_processing_failed', 500, {
 *       cause: error,
 *       logContext: { route: 'admin/process-refunds' },
 *     });
 *   }
 *
 * Note: this helper is server-only (depends on next/server). Client-side
 * error handling lives in `./handleApiError`.
 */

export type ApiErrorOptions = {
  /** Original error / value to log server-side (NOT returned to client). */
  cause?: unknown;
  /** Extra structured context merged into the log line. */
  logContext?: Record<string, unknown>;
};

/**
 * Stable code → generic, non-leaking human label. Kept intentionally minimal:
 * frontends should map the `code` to localized strings; this label is only a
 * sensible default for clients that ignore the code.
 */
const HUMAN_LABELS: Record<string, string> = {
  refund_processing_failed: 'Refund processing failed',
  freeze_status_unavailable: 'Freeze status unavailable',
  freeze_date_update_failed: 'Failed to update freeze date',
  internal_error: 'Internal server error',
};

function humanLabelFor(code: string): string | undefined {
  return HUMAN_LABELS[code];
}

/**
 * Normalise an unknown `cause` into a string suitable for structured logs.
 * Returns `undefined` only when no cause was provided.
 */
function describeCause(cause: unknown): string | undefined {
  if (cause === undefined) return undefined;
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

export function apiError(
  code: string,
  status = 500,
  opts: ApiErrorOptions = {}
): NextResponse {
  const { cause, logContext } = opts;
  const causeMessage = describeCause(cause);

  // Structured server-side log. JSON-shaped (one object) so log aggregators
  // and Sentry breadcrumbs can parse it without regexing strings. Includes
  // the real error so operators can debug — this never reaches the client.
  console.error('[api-error]', {
    code,
    status,
    ...(logContext ?? {}),
    ...(causeMessage !== undefined ? { cause: causeMessage } : {}),
  });

  // Forward to Sentry. If `cause` is not a real Error, synthesise one so we
  // still get a useful stack trace pointing at this helper.
  const errorForSentry =
    cause instanceof Error ? cause : new Error(`API error: ${code}`);

  // Pull `route` out of logContext into a Sentry tag (low cardinality);
  // everything else goes into `extra` for full visibility.
  const route =
    logContext && typeof logContext.route === 'string'
      ? (logContext.route as string)
      : undefined;

  captureError(errorForSentry, {
    tags: {
      code,
      status,
      ...(route ? { route } : {}),
    },
    extra: {
      ...(logContext ?? {}),
      ...(causeMessage !== undefined ? { cause: causeMessage } : {}),
    },
    level: status >= 500 ? 'error' : 'warning',
  });

  return NextResponse.json(
    {
      error: humanLabelFor(code) ?? 'Request failed',
      code,
    },
    { status }
  );
}
