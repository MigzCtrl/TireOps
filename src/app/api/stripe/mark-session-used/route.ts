import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, shopId, tier } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // Check if already marked as used
    const { data: existing } = await supabase
      .from('used_checkout_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (existing) {
      // Already marked, that's fine
      return NextResponse.json({ success: true, alreadyMarked: true });
    }

    // Mark session as used
    const { error: insertError } = await supabase
      .from('used_checkout_sessions')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        shop_id: shopId || null,
        tier: tier || 'pro',
        used_at: new Date().toISOString(),
      });

    if (insertError) {
      // Log but don't fail - table might not exist yet
      console.error('Failed to mark session as used:', insertError);

      // If it's a "table doesn't exist" error, that's ok
      if (insertError.code === '42P01') {
        return NextResponse.json({ success: true, tableNotReady: true });
      }

      return NextResponse.json(
        { error: 'Failed to mark session as used' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark session used error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
