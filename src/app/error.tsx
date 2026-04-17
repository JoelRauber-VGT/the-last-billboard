'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { captureError } from '@/lib/errors';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to error reporting service
    captureError(error, {
      component: 'ErrorBoundary',
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <AlertTriangle className="size-16 text-destructive" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold">500</h1>
          <h2 className="text-xl md:text-2xl font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground">
            We've been notified of the issue and are working to fix it.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="w-full sm:w-auto">
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="w-full sm:w-auto"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
