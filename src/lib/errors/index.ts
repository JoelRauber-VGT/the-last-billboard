/**
 * Error handling utilities
 * Centralized error handling for The Last Billboard
 */

export { handleApiError, withApiErrorHandling } from './handleApiError';
export {
  initSentry,
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
} from './sentry';
