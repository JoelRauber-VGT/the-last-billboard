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
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 })
  }

  // Path lives under <uid>/ so storage RLS scopes writes to the owner only.
  const path = `${user.id}/avatar-${Date.now()}.${extFor(file.type)}`

  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadErr) {
    console.error('avatar upload failed', uploadErr)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = pub.publicUrl

  // Replace previous avatar (best-effort: parse path from existing URL).
  const { data: prev } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single()
  const prevUrl = (prev as { avatar_url?: string | null } | null)?.avatar_url
  if (prevUrl) {
    const idx = prevUrl.indexOf('/avatars/')
    if (idx >= 0) {
      const oldPath = prevUrl.slice(idx + '/avatars/'.length)
      // Only delete if it lives under this user's folder — defensive.
      if (oldPath.startsWith(`${user.id}/`)) {
        await supabase.storage.from('avatars').remove([oldPath])
      }
    }
  }

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
    return NextResponse.json({ error: 'profile_update_failed' }, { status: 500 })
  }

  return NextResponse.json({ avatar_url: avatarUrl })
}

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { data: prev } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single()
  const prevUrl = (prev as { avatar_url?: string | null } | null)?.avatar_url
  if (prevUrl) {
    const idx = prevUrl.indexOf('/avatars/')
    if (idx >= 0) {
      const oldPath = prevUrl.slice(idx + '/avatars/'.length)
      if (oldPath.startsWith(`${user.id}/`)) {
        await supabase.storage.from('avatars').remove([oldPath])
      }
    }
  }

  const { error: updateErr } = await (supabase.from('profiles') as unknown as {
    update: (values: { avatar_url: string | null }) => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>
    }
  })
    .update({ avatar_url: null })
    .eq('id', user.id)

  if (updateErr) {
    console.error('avatar clear failed', updateErr)
    return NextResponse.json({ error: 'profile_update_failed' }, { status: 500 })
  }

  return NextResponse.json({ avatar_url: null })
}
