/**
 * Shared pagination parsing for admin list endpoints.
 *
 * - `page` defaults to 1 (1-indexed).
 * - `pageSize` defaults to 200 — large enough that the existing client-side
 *   filters/tables continue to work without a UI refactor, but small enough
 *   that we never scan an unbounded table. Capped at `MAX_PAGE_SIZE` so a
 *   malicious or buggy caller cannot ask for everything.
 * - The function returns Supabase-friendly `from`/`to` offsets in addition
 *   to the normalized values, so callers can pass them straight into
 *   `.range(from, to)`.
 */

export const DEFAULT_PAGE_SIZE = 200
export const MAX_PAGE_SIZE = 200

export type Pagination = {
  page: number
  pageSize: number
  from: number
  to: number
}

export function parsePagination(searchParams: URLSearchParams): Pagination {
  const rawPage = Number.parseInt(searchParams.get('page') ?? '', 10)
  const rawSize = Number.parseInt(searchParams.get('pageSize') ?? '', 10)

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1
  const pageSize =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(rawSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return { page, pageSize, from, to }
}
