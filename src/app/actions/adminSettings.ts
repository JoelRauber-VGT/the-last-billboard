'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { checkAdminAuth } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';

const updateSchema = z.object({
  freezeDateIso: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: 'Invalid datetime',
    }),
});

export type UpdateFreezeResult =
  | { ok: true; freezeDateIso: string }
  | { ok: false; error: string; code?: string };

export async function updateFreezeDate(
  input: z.infer<typeof updateSchema>
): Promise<UpdateFreezeResult> {
  const auth = await checkAdminAuth();
  if (!auth) {
    return { ok: false, error: 'Forbidden', code: 'forbidden' };
  }

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
      code: 'invalid_input',
    };
  }

  const { supabase, user } = auth;
  // Truncate to minute precision — the admin form only edits at minute
  // resolution, so storing seconds creates false "moving earlier"
  // diffs on subsequent loads.
  const minuteFloored = new Date(parsed.data.freezeDateIso);
  minuteFloored.setUTCSeconds(0, 0);
  const iso = minuteFloored.toISOString();

  // Read previous value for the audit log.
  const { data: previous } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'billboard_ends_at')
    .maybeSingle();

  // Upsert the freeze date. JSONB column stores it as a JSON string.
  const { error: upsertError } = await supabase
    .from('app_settings')
    .upsert(
      {
        key: 'billboard_ends_at',
        value: iso,
        updated_by: user.id,
      },
      { onConflict: 'key' }
    );

  if (upsertError) {
    // Never propagate the raw Supabase / Postgres message to the client —
    // it can include schema details, constraint names, etc. Log server-side,
    // return a stable code instead.
    console.error('[api-error]', {
      code: 'freeze_date_update_failed',
      route: 'actions/adminSettings.updateFreezeDate',
      adminId: user.id,
      cause: upsertError.message,
    });
    return { ok: false, error: 'update_failed', code: 'freeze_date_update_failed' };
  }

  // Audit trail (uses the shared helper so it shows up in the existing
  // admin_audit_log queries).
  await logAdminAction({
    adminId: user.id,
    action: 'update_freeze_date',
    targetType: 'app_settings',
    details: {
      key: 'billboard_ends_at',
      previous: previous?.value ?? null,
      next: iso,
    },
  });

  // Revalidate the locale layout (Footer reads freezeDate there) and
  // the home page (FullscreenBillboard `isFrozen` prop).
  revalidatePath('/', 'layout');

  return { ok: true, freezeDateIso: iso };
}
