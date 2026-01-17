import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_SERVICES } from '@/types/database';

// GET - Fetch all services for the shop
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's shop
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    if (!profile?.shop_id) {
      return NextResponse.json({ error: 'No shop found' }, { status: 404 });
    }

    // Fetch services
    const { data: services, error } = await supabase
      .from('shop_services')
      .select('*')
      .eq('shop_id', profile.shop_id)
      .order('sort_order', { ascending: true });

    if (error) {
      // Table might not exist yet - return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ services: [], needsMigration: true });
      }
      throw error;
    }

    return NextResponse.json({ services: services || [] });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

// POST - Create a new service or initialize defaults
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's shop and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.shop_id) {
      return NextResponse.json({ error: 'No shop found' }, { status: 404 });
    }

    // Only owner/admin can modify services
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();

    // If action is 'initialize', create default services
    if (body.action === 'initialize') {
      const servicesToInsert = DEFAULT_SERVICES.map(service => ({
        ...service,
        shop_id: profile.shop_id,
      }));

      const { data: services, error } = await supabase
        .from('shop_services')
        .insert(servicesToInsert)
        .select();

      if (error) throw error;
      return NextResponse.json({ services, message: 'Default services created' });
    }

    // Otherwise, create a single service
    const { name, description, category, price, price_type, is_active, is_taxable, sort_order } = body;

    if (!name || !category || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: service, error } = await supabase
      .from('shop_services')
      .insert({
        shop_id: profile.shop_id,
        name,
        description: description || '',
        category,
        price: parseFloat(price) || 0,
        price_type: price_type || 'per_tire',
        is_active: is_active !== false,
        is_taxable: is_taxable !== false,
        sort_order: sort_order || 100,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}

// PUT - Update a service
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.shop_id) {
      return NextResponse.json({ error: 'No shop found' }, { status: 404 });
    }

    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Service ID required' }, { status: 400 });
    }

    const { data: service, error } = await supabase
      .from('shop_services')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('shop_id', profile.shop_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

// DELETE - Delete a service
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.shop_id) {
      return NextResponse.json({ error: 'No shop found' }, { status: 404 });
    }

    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Service ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('shop_services')
      .delete()
      .eq('id', id)
      .eq('shop_id', profile.shop_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}
