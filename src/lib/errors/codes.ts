/**
 * Stable, route-agnostic error codes returned by API routes and server
 * actions in `{ error: '<human-readable>', code: '<stable_code>' }` JSON
 * payloads. The `code` is the contract; the `error` text is a fallback for
 * non-i18n consumers.
 *
 * Frontend translates via `messages/*.json → errors.codes.<code>`.
 *
 * IMPORTANT:
 *   - Codes MUST be snake_case ASCII.
 *   - Codes are reused across routes when semantically identical
 *     (e.g. `auth_required`, `invalid_input`, `internal_error`).
 *   - Every code listed here MUST exist in ALL four `messages/*.json`
 *     files under `errors.codes.<code>`.
 *
 * If you add a new code:
 *   1. Append it below (alphabetical within its group).
 *   2. Add the translation in en/de/fr/es JSON.
 *   3. Run `tsc --noEmit` and the i18n verification grep in WP9 docs.
 */
export const ERROR_CODES = {
  // Auth / authorization
  auth_required: 'auth_required',
  forbidden: 'forbidden',
  not_owner: 'not_owner',

  // Validation / input
  invalid_input: 'invalid_input',
  invalid_image_url: 'invalid_image_url',
  invalid_image_type: 'invalid_image_type',
  invalid_link_url: 'invalid_link_url',
  invalid_brand_color: 'invalid_brand_color',
  invalid_display_name: 'invalid_display_name',
  invalid_mode: 'invalid_mode',
  missing_slot_id: 'missing_slot_id',
  no_file: 'no_file',
  too_large: 'too_large',

  // Domain: slot
  slot_not_found: 'slot_not_found',
  slot_not_anonymous: 'slot_not_anonymous',
  slot_unowned: 'slot_unowned',
  self_target: 'self_target',
  self_outbid: 'self_outbid',

  // Domain: bid / payment
  billboard_frozen: 'billboard_frozen',
  bid_too_low: 'bid_too_low',
  bid_invalid: 'bid_invalid',
  payment_session_failed: 'payment_session_failed',
  transaction_create_failed: 'transaction_create_failed',
  stripe_link_failed: 'stripe_link_failed',
  profile_not_found: 'profile_not_found',

  // Domain: report
  report_submit_failed: 'report_submit_failed',

  // Domain: reveal request
  already_sent: 'already_sent',
  already_responded: 'already_responded',
  insert_failed: 'insert_failed',
  update_failed: 'update_failed',
  not_found: 'not_found',

  // Domain: admin
  admin_toggle_failed: 'admin_toggle_failed',
  last_admin: 'last_admin',
  self_demote: 'self_demote',
  hide_failed: 'hide_failed',
  restore_failed: 'restore_failed',
  remove_failed: 'remove_failed',
  fetch_failed: 'fetch_failed',
  dismiss_failed: 'dismiss_failed',

  // Domain: account
  delete_failed: 'delete_failed',
  partial_delete: 'partial_delete',
  export_failed: 'export_failed',
  upload_failed: 'upload_failed',
  profile_update_failed: 'profile_update_failed',

  // Domain: refund / freeze (already used by apiError() helper)
  refund_processing_failed: 'refund_processing_failed',
  refund_already_pending: 'refund_already_pending',
  freeze_status_unavailable: 'freeze_status_unavailable',
  freeze_date_update_failed: 'freeze_date_update_failed',

  // Generic
  rate_check_failed: 'rate_check_failed',
  rate_limited: 'rate_limited',
  query_failed: 'query_failed',
  internal_error: 'internal_error',
  database_error: 'database_error',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Type guard for narrowing an unknown body value into a known error code.
 * Used by the frontend `handleApiError` to decide whether to look up a
 * translation under `errors.codes.<code>` vs falling back to HTTP-status.
 */
export function isKnownErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(ERROR_CODES, value)
  );
}
