import { toast } from 'sonner';
import { isKnownErrorCode } from './codes';

/**
 * Shape of the error body returned by every API route / server action that
 * follows the WP9 contract: stable `code`, plus a free-form `error` string
 * for legacy / non-i18n consumers.
 */
type ApiErrorBody = {
  error?: string;
  code?: string;
};

/**
 * Translate an API error code via `errors.codes.<code>`. Falls back to
 * `null` when the code is not a known one — caller then uses the HTTP-status
 * fallback path.
 *
 * The translator argument is the same `t` returned by `useTranslations()`,
 * scoped to the root namespace (or any ancestor of `errors`). We always
 * pass the fully-qualified key so the helper works regardless of which
 * namespace the caller bound to.
 */
function translateCode(
  t: (key: string) => string,
  code: string | undefined
): string | null {
  if (!isKnownErrorCode(code)) return null;
  // next-intl throws on missing keys in dev; we only call this for codes
  // that are explicitly registered in `ERROR_CODES`, so misses are a bug,
  // not a runtime concern.
  return t(`errors.codes.${code}`);
}

/**
 * Try to extract `{ error?, code? }` from a Response that has not yet been
 * consumed. Best-effort — clones the response so the caller can still read
 * the body afterwards. Returns `null` if the body is not JSON or the read
 * fails.
 */
async function extractBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    const cloned = response.clone();
    const text = await cloned.text();
    if (!text) return null;
    return JSON.parse(text) as ApiErrorBody;
  } catch {
    return null;
  }
}

/**
 * Map an HTTP status code to a top-level fallback translation key. This
 * preserves the previous behaviour from before the WP9 refactor — used
 * when no body code is present or the code is unknown.
 */
function fallbackKeyForStatus(status: number): string {
  switch (status) {
    case 401:
      return 'errors.unauthorized';
    case 403:
      return 'errors.forbidden';
    case 404:
      return 'errors.notFound';
    case 429:
      return 'errors.rateLimit';
    case 500:
    case 502:
    case 503:
      return 'errors.serverError';
    default:
      return 'errors.generic';
  }
}

/**
 * Internal: resolve the user-facing message for a Response, then toast it
 * and (for 401) trigger the login redirect side-effect that the legacy
 * helper had.
 *
 * Resolution order:
 *   1. body.code → `errors.codes.<code>` (if registered + translation present)
 *   2. HTTP status → existing top-level `errors.*` keys (legacy fallback)
 */
function handleResponse(
  response: Response,
  t: (key: string) => string,
  body: ApiErrorBody | null
): void {
  const codeMessage = translateCode(t, body?.code);
  const message = codeMessage ?? t(fallbackKeyForStatus(response.status));
  toast.error(message);

  if (response.status === 401) {
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  } else if (response.status >= 500) {
    console.error('API error:', response);
  }
}

/**
 * Handles API errors consistently across the application.
 *
 * Accepts (in order of preference):
 *   - `Response` — will read the body and look for `{ code }`. Note: this
 *      reads the body, so callers that need to read it themselves should
 *      pass the parsed body via the third arg instead and supply the
 *      original Response for status info.
 *   - any other `unknown` (network errors, thrown JS errors, etc.).
 *
 * @param error - The error object (Response or generic Error)
 * @param t - Translation function (root-scoped, e.g. useTranslations() with
 *            no argument or a parent of `errors`)
 * @param body - Optional already-parsed body. Use this when you've called
 *               `response.json()` yourself and don't want this helper to
 *               re-read the (now-locked) stream.
 */
export function handleApiError(
  error: unknown,
  t: (key: string) => string,
  body?: ApiErrorBody | null
): void | Promise<void> {
  // Handle Response errors
  if (error instanceof Response) {
    if (body !== undefined) {
      handleResponse(error, t, body ?? null);
      return;
    }
    // Async path: read body, then dispatch. Returned promise is awaited
    // by `withApiErrorHandling`; direct callers can ignore it because
    // we always toast, regardless of whether the read succeeds.
    return extractBody(error).then((parsed) =>
      handleResponse(error, t, parsed)
    );
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    toast.error(t('errors.networkError'));
    console.error('Network error:', error);
    return;
  }

  // Generic error fallback
  toast.error(t('errors.generic'));
  console.error('Unexpected error:', error);
}

/**
 * Wraps an async API call with error handling
 * @param fn - The async function to wrap
 * @param t - Translation function
 * @param options - Optional configuration
 */
export async function withApiErrorHandling<T>(
  fn: () => Promise<T>,
  t: (key: string) => string,
  options?: {
    onError?: (error: unknown) => void;
    successMessage?: string;
  }
): Promise<T | null> {
  try {
    const result = await fn();
    if (options?.successMessage) {
      toast.success(options.successMessage);
    }
    return result;
  } catch (error) {
    await handleApiError(error, t);
    options?.onError?.(error);
    return null;
  }
}
