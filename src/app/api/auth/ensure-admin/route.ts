import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'

/**
 * Ensures first user is set as admin
 * This is called after successful authentication
 * Idempotent operation - safe to call multiple times
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if any admin exists in the system
    const { data: existingAdmins, error: adminCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(1)

    if (adminCheckError) {
      console.error('Error checking for existing admins:', adminCheckError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // If no admins exist, make current user admin
    if (!existingAdmins || existingAdmins.length === 0) {
      const updateResult = supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', user.id)
      
      // @ts-ignore - TypeScript inference issue with Supabase update types
      const { error: updateError } = await updateResult

      if (updateError) {
        console.error('Error setting first user as admin:', updateError)
        return NextResponse.json({ error: 'Failed to set admin' }, { status: 500 })
      }

      console.log(`First user ${user.id} set as admin`)
      return NextResponse.json({
        success: true,
        message: 'First user set as admin',
        is_admin: true
      })
    }

    // Admin already exists, check if current user is admin
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Admin check completed',
      is_admin: currentProfile?.is_admin || false
    })

  } catch (error) {
    console.error('Unexpected error in ensure-admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
