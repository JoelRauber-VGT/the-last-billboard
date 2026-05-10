/**
 * Error handling utilities
 * Centralized error handling for The Last Billboard
 */

export { handleApiError, withApiErrorHandling } from './handleApiError';
export { apiError, type ApiErrorOptions } from './apiError';
export { ERROR_CODES, isKnownErrorCode, type ErrorCode } from './codes';
export {
  initSentry,
  captureError,
  captureMessage,
  setSentryUser,
  setUserContext,
  clearUserContext,
  type ErrorContext,
} from './sentry';
