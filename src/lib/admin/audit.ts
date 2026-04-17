import { createServerClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(params: {
  adminId: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
}) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('admin_audit_log')
    .insert({
      admin_id: params.adminId,
      action: params.action,
      target_type: params.targetType || null,
      target_id: params.targetId || null,
      details: (params.details || null) as Json,
    })

  if (error) {
    console.error('Failed to log admin action:', error)
    // Don't throw - audit logging shouldn't break the operation
  }
}
