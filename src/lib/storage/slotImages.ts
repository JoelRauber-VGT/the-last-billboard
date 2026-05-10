import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'slot-images'

// Public URLs look like: https://<project>.supabase.co/storage/v1/object/public/slot-images/<path>
const PUBLIC_URL_RE = /\/storage\/v1\/object\/public\/slot-images\/([^?]+)/

/**
 * Strict SSRF guard: ensure a client-supplied image URL points at our own
 * Supabase storage public-object endpoint for the given bucket.
 *
 * Why this exists: callers like createBidCheckoutSession used to fetch the
 * URL with HEAD to sniff the MIME type. Without this gate an attacker could
 * point us at internal services (169.254.169.254 metadata, localhost admin
 * ports, etc.) and observe response timing/headers — classic SSRF probe.
 *
 * We compare full origin equality (not substring) against
 * NEXT_PUBLIC_SUPABASE_URL and require the path to start with the canonical
 * `/storage/v1/object/public/<bucket>/` prefix. Userinfo (`https://x@evil`),
 * punycode hostnames, and protocol tricks all fail the origin check because
 * URL.origin is normalized.
 *
 * Returns true on match; false on any malformed/foreign URL. Never throws.
 */
export function isSupabaseStoragePublicUrl(
  url: string | null | undefined,
  bucket: string = BUCKET
): boolean {
  if (!url || typeof url !== 'string') return false

  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseBase) return false

  let expectedOrigin: string
  try {
    expectedOrigin = new URL(supabaseBase).origin
  } catch {
    return false
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  // Reject anything that smuggles credentials. URL parsing accepts
  // `https://attacker@supabase.co/...` and the origin still matches; the
  // server fetch resolves the host correctly so it's not a vector here, but
  // we strip the surface anyway because legitimate public URLs never carry
  // userinfo.
  if (parsed.username || parsed.password) return false

  if (parsed.protocol !== 'https:') return false
  if (parsed.origin !== expectedOrigin) return false

  const requiredPrefix = `/storage/v1/object/public/${bucket}/`
  if (!parsed.pathname.startsWith(requiredPrefix)) return false

  // Reject empty object path (`.../slot-images/`).
  if (parsed.pathname.length <= requiredPrefix.length) return false

  return true
}

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
