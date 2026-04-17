import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { processRefunds } from '@/lib/stripe/processRefunds';
import { cookies } from 'next/headers';

/**
 * POST /api/admin/process-refunds
 * Manually trigger refund processing
 * Admin only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client to check admin status
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    console.log(`[${new Date().toISOString()}] Admin ${user.id} triggered refund processing`);

    // Process refunds
    const results = await processRefunds();

    console.log(`[${new Date().toISOString()}] Refund processing complete:`, results);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Error processing refunds:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
