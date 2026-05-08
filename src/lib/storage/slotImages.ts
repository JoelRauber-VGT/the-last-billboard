import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'slot-images'

// Public URLs look like: https://<project>.supabase.co/storage/v1/object/public/slot-images/<path>
const PUBLIC_URL_RE = /\/storage\/v1\/object\/public\/slot-images\/([^?]+)/

/**
 * Extract the storage object path from a slot image's public URL.
 * Returns null for malformed URLs or URLs that don't belong to this bucket.
 */
export function parseSlotImagePath(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(PUBLIC_URL_RE)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

/**
 * Best-effort deletion of a slot-image by its public URL.
 * Caller must use a Supabase client with sufficient privileges (service role
 * for admin/system flows, the user's own client for self-cleanup).
 */
export async function deleteSlotImageByUrl(
  supabase: SupabaseClient,
  url: string | null | undefined
): Promise<{ ok: boolean; path: string | null; error?: string }> {
  const path = parseSlotImagePath(url)
  if (!path) return { ok: false, path: null, error: 'not-a-slot-image-url' }

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    return { ok: false, path, error: error.message }
  }
  return { ok: true, path }
}

/**
 * Delete every object in slot-images whose filename starts with the given
 * user-id prefix. Used during account deletion. Service-role required because
 * storage delete is not covered by the public-read policy.
 *
 * Filename convention (uploadSlotImage.ts): `${userId}_${timestamp}_${name}`.
 * We list the bucket root, filter client-side by prefix, and remove in one batch.
 */
export async function deleteAllUserImages(
  supabase: SupabaseClient,
  userId: string
): Promise<{ removed: number; failed: number }> {
  let removed = 0
  let failed = 0
  // Page through the bucket. Supabase list() returns up to 1000 by default.
  let offset = 0
  const limit = 1000
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(undefined, { limit, offset })
    if (error || !data) {
      failed += 1
      break
    }
    if (data.length === 0) break

    const owned = data
      .filter((entry) => entry.name.startsWith(`${userId}_`))
      .map((entry) => entry.name)

    if (owned.length > 0) {
      const { error: rmError } = await supabase.storage.from(BUCKET).remove(owned)
      if (rmError) {
        failed += owned.length
      } else {
        removed += owned.length
      }
    }

    if (data.length < limit) break
    offset += limit
  }

  return { removed, failed }
}
