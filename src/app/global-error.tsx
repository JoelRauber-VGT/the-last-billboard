'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to error reporting service
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
          <div className="text-center space-y-6 max-w-md">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold">500</h1>
              <h2 className="text-xl md:text-2xl font-semibold">Something went wrong</h2>
              <p className="text-muted-foreground">
                A critical error occurred. Please try refreshing the page.
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
