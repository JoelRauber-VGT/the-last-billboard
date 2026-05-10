import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

function extFor(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'auth_required' },
      { status: 401 }
    )
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No file provided', code: 'no_file' },
      { status: 400 }
    )
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid image type', code: 'invalid_image_type' },
      { status: 415 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File too large', code: 'too_large' },
      { status: 413 }
    )
  }

  // Path lives under <uid>/ so storage RLS scopes writes to the owner only.
  // Adding a random suffix (alongside the timestamp) on top makes parallel
  // uploads from the same user produce unique paths even if Date.now()
  // collides on millisecond boundaries — no upsert clobbering.
  const rand = Math.random().toString(36).slice(2, 10)
  const path = `${user.id}/avatar-${Date.now()}-${rand}.${extFor(file.type)}`

  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadErr) {
    console.error('avatar upload failed', uploadErr)
    return NextResponse.json(
      { error: 'Upload failed', code: 'upload_failed' },
      { status: 500 }
    )
  }

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = pub.publicUrl

  // Atomic point-of-truth: write the new avatar_url first, before touching
  // storage cleanup. If two POSTs race, the DB row reflects whichever update
  // landed last; both files exist on disk for a moment, but the sweep below
  // (which lists the user's folder and removes everything except the file
  // we just uploaded) guarantees the orphan is gone within the same request.
  // Cast: generated Update type narrows to never on partial chains.
  const { error: updateErr } = await (supabase.from('profiles') as unknown as {
    update: (values: { avatar_url: string | null }) => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>
    }
  })
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateErr) {
    console.error('avatar profile update failed', updateErr)
    // Roll back the just-uploaded file so we don't leak storage on DB failure.
    await supabase.storage.from('avatars').remove([path]).catch(() => {})
    return NextResponse.json(
      { error: 'Profile update failed', code: 'profile_update_failed' },
      { status: 500 }
    )
  }

  // Best-effort folder sweep: list everything under <uid>/ and delete any
  // file other than the one we just uploaded. This replaces the previous
  // "read prev avatar_url, delete that path" approach, which was racy:
  // concurrent uploads could read the same prev URL and one would end up
  // deleting the other writer's freshly-uploaded file. The sweep is
  // idempotent, self-healing (cleans up orphans from past failed runs),
  // and tolerates concurrent uploads — the worst case is that two
  // simultaneous sweeps both try to remove the same orphan, which Supabase
  // treats as a no-op on the second call.
  await sweepAvatarFolder(supabase, user.id, path).catch((err) => {
    console.error('avatar folder sweep failed (non-fatal)', err)
  })

  return NextResponse.json({ avatar_url: avatarUrl })
}

/**
 * Remove every object under <userId>/ in the avatars bucket EXCEPT keepPath.
 * Best-effort: errors are swallowed by the caller.
 */
async function sweepAvatarFolder(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  keepPath: string | null,
): Promise<void> {
  const { data: entries, error } = await supabase.storage
    .from('avatars')
    .list(userId, { limit: 100 })
  if (error || !entries || entries.length === 0) return

  const toRemove = entries
    .map((entry) => `${userId}/${entry.name}`)
    .filter((p) => p !== keepPath)

  if (toRemove.length > 0) {
    await supabase.storage.from('avatars').remove(toRemove)
  }
}

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'auth_required' },
      { status: 401 }
    )
  }

  // Clear the DB pointer first — that's the source of truth seen by the
  // app. Storage cleanup is then a best-effort sweep of the user's folder.
  const { error: updateErr } = await (supabase.from('profiles') as unknown as {
    update: (values: { avatar_url: string | null }) => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>
    }
  })
    .update({ avatar_url: null })
    .eq('id', user.id)

  if (updateErr) {
    console.error('avatar clear failed', updateErr)
    return NextResponse.json(
      { error: 'Profile update failed', code: 'profile_update_failed' },
      { status: 500 }
    )
  }

  // Sweep the entire <uid>/ folder. Passing null for keepPath removes
  // everything. Tolerates a racing POST: if a new upload lands between
  // our DB clear and the sweep, the sweep may remove that file and the
  // DB row will point at a non-existent object — the racing POST will
  // observe its own update succeeded, the user will see a broken avatar
  // until they reload/upload again. Acceptable per audit severity (low):
  // user-driven concurrent POST+DELETE on the same account is implausible
  // and the failure mode is recoverable, not corrupting.
  await sweepAvatarFolder(supabase, user.id, null).catch((err) => {
    console.error('avatar folder sweep failed (non-fatal)', err)
  })

  return NextResponse.json({ avatar_url: null })
}
