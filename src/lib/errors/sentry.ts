/**
 * Sentry adapter — thin wrapper around `@sentry/nextjs`.
 *
 * Design goals:
 * - Zero hard dependency: if `@sentry/nextjs` is not installed OR no DSN is
 *   configured, every helper degrades to a structured `console.error` /
 *   `console.log` and returns gracefully.
 * - Loaded via dynamic import so the package is optional. The first call
 *   resolves the module (or `null`) once and caches it.
 * - Safe to call from any runtime (server, edge, client). Initialization of
 *   the Sentry SDK itself is expected to happen via the standard
 *   `sentry.{client,server,edge}.config.ts` files that `@sentry/nextjs`
 *   auto-loads — this module does NOT call `Sentry.init` to avoid
 *   double-initialisation.
 *
 * Always logs structured JSON to the console, even when Sentry is wired up,
 * so operators see issues in stdout/stderr regardless of the upstream sink.
 */

type Level = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorContext {
  /** Logical component / route / module that produced the error. */
  component?: string;
  /** Action being performed when the error occurred. */
  action?: string;
  /** End-user id, if known (do not put PII here). */
  userId?: string;
  /** Sentry tags — short, low-cardinality strings used for filtering. */
  tags?: Record<string, string | number | boolean | undefined>;
  /** Sentry extras — arbitrary structured data. */
  extra?: Record<string, unknown>;
  /** Severity. Defaults to 'error' for `captureError`. */
  level?: Level;
  /** Any additional fields are merged into the structured console log. */
  [key: string]: unknown;
}

// Minimal shape of `@sentry/nextjs` we actually call. Kept loose on purpose.
type SentryModule = {
  captureException?: (
    error: unknown,
    hint?: {
      tags?: Record<string, string | number | boolean | undefined>;
      extra?: Record<string, unknown>;
      level?: Level;
    }
  ) => void;
  captureMessage?: (
    message: string,
    hint?: {
      level?: Level;
      tags?: Record<string, string | number | boolean | undefined>;
      extra?: Record<string, unknown>;
    }
  ) => void;
  setUser?: (
    user:
      | { id: string; email?: string; username?: string }
      | null
  ) => void;
};

let sentryPromise: Promise<SentryModule | null> | null = null;

function dsnConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  );
}

/**
 * Lazily resolve `@sentry/nextjs`. Returns `null` if the package is not
 * installed or no DSN is configured — both are valid states.
 */
function loadSentry(): Promise<SentryModule | null> {
  if (!dsnConfigured()) return Promise.resolve(null);
  if (sentryPromise) return sentryPromise;

  // `@sentry/nextjs` is an optional peer — the project intentionally does
  // not list it as a dependency. We resolve it at *runtime* via an indirect
  // require/import so neither webpack nor Turbopack tries to bundle it (and
  // therefore won't fail the build when the package is absent). When the
  // package is missing OR no DSN is set, we fall back to console-only.
  const moduleName = '@sentry/nextjs';
  sentryPromise = (async () => {
    try {
      // Use Function() to avoid bundlers static-analysing the import target.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const dynamicImport = new Function(
        'm',
        'return import(m)'
      ) as (m: string) => Promise<unknown>;
      const mod = await dynamicImport(moduleName);
      return (mod as SentryModule) ?? null;
    } catch {
      return null;
    }
  })();
  return sentryPromise;
}

/**
 * Public, deprecated no-op kept for backward compatibility. Real Sentry
 * initialisation happens via `sentry.{client,server,edge}.config.ts` which
 * `@sentry/nextjs` auto-loads. Calling this is harmless.
 */
export function initSentry(): void {
  if (dsnConfigured()) {
    // Touch the loader so we surface installation issues early.
    void loadSentry();
  }
}

function normaliseError(error: unknown): {
  err: Error;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return { err: error, message: error.message, stack: error.stack };
  }
  if (typeof error === 'string') {
    const err = new Error(error);
    return { err, message: error, stack: err.stack };
  }
  let serialised: string;
  try {
    serialised = JSON.stringify(error);
  } catch {
    serialised = String(error);
  }
  const err = new Error(serialised);
  return { err, message: serialised, stack: err.stack };
}

/**
 * Capture an error: ALWAYS log structured JSON to the console, and ALSO
 * forward to Sentry when available. Never throws.
 */
export function captureError(
  error: Error | unknown,
  context?: ErrorContext
): void {
  const { err, message, stack } = normaliseError(error);
  const { tags, extra, level, ...rest } = context ?? {};

  // Structured console log — always, regardless of Sentry availability.
  // Operators rely on this in stdout/stderr.
  try {
    console.error('[error]', {
      message,
      stack,
      ...(Object.keys(rest).length > 0 ? rest : {}),
      ...(tags ? { tags } : {}),
      ...(extra ? { extra } : {}),
      ...(level ? { level } : {}),
    });
  } catch {
    // console.error itself shouldn't throw; ignore if it does.
  }

  // Forward to Sentry if available. Fire-and-forget; never await on caller.
  void loadSentry().then((Sentry) => {
    if (!Sentry?.captureException) return;
    try {
      Sentry.captureException(err, {
        tags,
        extra,
        level: level ?? 'error',
      });
    } catch {
      // Swallow Sentry errors — never let them break a request path.
    }
  });
}

/**
 * Capture a non-error message (info / warning / error). Same dual-write
 * semantics as `captureError`.
 */
export function captureMessage(
  message: string,
  level: Level = 'info',
  context?: ErrorContext
): void {
  const { tags, extra, ...rest } = context ?? {};

  try {
    const logger =
      level === 'error' || level === 'fatal'
        ? console.error
        : level === 'warning'
          ? console.warn
          : console.log;
    logger.call(console, `[${level}]`, {
      message,
      ...(Object.keys(rest).length > 0 ? rest : {}),
      ...(tags ? { tags } : {}),
      ...(extra ? { extra } : {}),
    });
  } catch {
    // ignore
  }

  void loadSentry().then((Sentry) => {
    if (!Sentry?.captureMessage) return;
    try {
      Sentry.captureMessage(message, { level, tags, extra });
    } catch {
      // ignore
    }
  });
}

/**
 * Set the Sentry user context. Safe to call when Sentry isn't configured —
 * it just no-ops. Do NOT pass PII you wouldn't want in your error sink.
 */
export function setSentryUser(
  userId: string,
  extras?: { email?: string; username?: string }
): void {
  void loadSentry().then((Sentry) => {
    if (!Sentry?.setUser) return;
    try {
      Sentry.setUser({ id: userId, ...extras });
    } catch {
      // ignore
    }
  });
}

/** Backward-compatible alias for the previous API name. */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  setSentryUser(user.id, { email: user.email, username: user.username });
}

/** Clear Sentry user context (e.g. on sign-out). */
export function clearUserContext(): void {
  void loadSentry().then((Sentry) => {
    if (!Sentry?.setUser) return;
    try {
      Sentry.setUser(null);
    } catch {
      // ignore
    }
  });
}
