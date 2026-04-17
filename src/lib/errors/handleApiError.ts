import { toast } from 'sonner';

/**
 * Handles API errors consistently across the application
 * @param error - The error object (Response or generic Error)
 * @param t - Translation function for error messages
 */
export function handleApiError(error: unknown, t: (key: string) => string) {
  // Handle Response errors
  if (error instanceof Response) {
    switch (error.status) {
      case 401:
        toast.error(t('errors.unauthorized'));
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return;

      case 403:
        toast.error(t('errors.forbidden'));
        return;

      case 429:
        toast.error(t('errors.rateLimit'));
        return;

      case 404:
        toast.error(t('errors.notFound'));
        return;

      case 500:
      case 502:
      case 503:
        toast.error(t('errors.serverError'));
        return;

      default:
        toast.error(t('errors.generic'));
        console.error('API error:', error);
        return;
    }
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
    handleApiError(error, t);
    options?.onError?.(error);
    return null;
  }
}
