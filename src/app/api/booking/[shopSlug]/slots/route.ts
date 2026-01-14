import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getBookingRateLimiter, checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Lazy initialization to avoid build-time errors
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseAdmin;
}

interface BookingSettings {
  business_hours: {
    [key: string]: { open: string; close: string; enabled: boolean }
  };
  slot_duration: number;
  buffer_time: number;
  max_days_ahead: number;
  services: string[];
}

const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  business_hours: {
    monday: { open: '08:00', close: '17:00', enabled: true },
    tuesday: { open: '08:00', close: '17:00', enabled: true },
    wednesday: { open: '08:00', close: '17:00', enabled: true },
    thursday: { open: '08:00', close: '17:00', enabled: true },
    friday: { open: '08:00', close: '17:00', enabled: true },
    saturday: { open: '09:00', close: '14:00', enabled: true },
    sunday: { open: '00:00', close: '00:00', enabled: false },
  },
  slot_duration: 60,
  buffer_time: 15,
  max_days_ahead: 30,
  services: ['Tire Installation', 'Tire Rotation', 'Tire Repair', 'Wheel Alignment', 'Tire Balance'],
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function generateTimeSlots(
  date: Date,
  settings: BookingSettings,
  existingAppointments: { scheduled_time: string }[]
): string[] {
  const dayName = DAY_NAMES[date.getDay()];
  const daySettings = settings.business_hours[dayName];

  if (!daySettings?.enabled) {
    return [];
  }

  const slots: string[] = [];
  const [openHour, openMin] = daySettings.open.split(':').map(Number);
  const [closeHour, closeMin] = daySettings.close.split(':').map(Number);

  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  // Get booked times for this day
  const bookedTimes = new Set(
    existingAppointments.map((a) => a.scheduled_time?.substring(0, 5))
  );

  // Generate slots
  for (let time = openMinutes; time + settings.slot_duration <= closeMinutes; time += settings.slot_duration + settings.buffer_time) {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Check if slot is available
    if (!bookedTimes.has(timeStr)) {
      slots.push(timeStr);
    }
  }

  return slots;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  try {
    // Rate limiting check
    const rateLimitResponse = await checkRateLimit(
      getBookingRateLimiter(),
      getClientIp(request)
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { shopSlug } = await params;
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    if (!dateStr) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get shop by slug
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, name, booking_enabled, booking_settings')
      .eq('slug', shopSlug)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    if (!shop.booking_enabled) {
      return NextResponse.json({ error: 'Online booking not enabled for this shop' }, { status: 403 });
    }

    const settings: BookingSettings = shop.booking_settings || DEFAULT_BOOKING_SETTINGS;
    const requestedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate date is not in the past
    if (requestedDate < today) {
      return NextResponse.json({ slots: [] });
    }

    // Validate date is within booking window
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + settings.max_days_ahead);
    if (requestedDate > maxDate) {
      return NextResponse.json({ slots: [] });
    }

    // Get existing appointments for this date
    const { data: appointments } = await supabase
      .from('work_orders')
      .select('scheduled_time')
      .eq('shop_id', shop.id)
      .eq('scheduled_date', dateStr)
      .neq('status', 'cancelled');

    const slots = generateTimeSlots(requestedDate, settings, appointments || []);

    return NextResponse.json({
      slots,
      settings: {
        services: settings.services,
        slot_duration: settings.slot_duration,
      },
    });
  } catch (error) {
    console.error('Slots API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
