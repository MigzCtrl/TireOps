import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { sendEmail, appointmentReminderEmail } from '@/lib/email';
import { sendSms, bookingConfirmationSms } from '@/lib/twilio';
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

const bookingSchema = z.object({
  customerName: z.string().min(1, 'Name is required').max(100),
  customerPhone: z.string().min(10, 'Valid phone required').max(20),
  customerEmail: z.string().email('Valid email required').optional().or(z.literal('')),
  serviceType: z.string().min(1, 'Service type is required'),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  notes: z.string().max(500).optional(),
  vehicleInfo: z.string().max(200).optional(),
});

export async function POST(
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
    const body = await request.json();

    // Validate input
    const validatedData = bookingSchema.parse(body);

    const supabase = getSupabaseAdmin();

    // Get shop by slug
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, name, email, phone, address, booking_enabled, booking_settings')
      .eq('slug', shopSlug)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    if (!shop.booking_enabled) {
      return NextResponse.json({ error: 'Online booking not enabled' }, { status: 403 });
    }

    // Create or find customer (slot availability enforced by DB unique constraint)
    let customerId: string;

    // Check if customer exists by phone
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('shop_id', shop.id)
      .eq('phone', validatedData.customerPhone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          shop_id: shop.id,
          name: validatedData.customerName,
          phone: validatedData.customerPhone,
          email: validatedData.customerEmail || null,
          notes: validatedData.vehicleInfo ? `Vehicle: ${validatedData.vehicleInfo}` : null,
        })
        .select('id')
        .single();

      if (customerError || !newCustomer) {
        console.error('Customer creation error:', customerError);
        return NextResponse.json({ error: 'Failed to create customer record' }, { status: 500 });
      }

      customerId = newCustomer.id;
    }

    // Create work order
    const { data: workOrder, error: workOrderError } = await supabase
      .from('work_orders')
      .insert({
        shop_id: shop.id,
        customer_id: customerId,
        service_type: validatedData.serviceType,
        scheduled_date: validatedData.scheduledDate,
        scheduled_time: validatedData.scheduledTime,
        notes: validatedData.notes || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (workOrderError) {
      console.error('Work order creation error:', workOrderError);
      // Check if it's a unique constraint violation (double-booking attempt)
      if (workOrderError.code === '23505' || workOrderError.message?.includes('unique')) {
        return NextResponse.json(
          { error: 'This time slot was just booked. Please select another time.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    if (!workOrder) {
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    // Format date for display
    const formattedDate = new Date(validatedData.scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Format time for display
    const [hours, minutes] = validatedData.scheduledTime.split(':');
    const hour = parseInt(hours);
    const formattedTime = `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;

    // Send confirmation email (if email provided)
    if (validatedData.customerEmail) {
      try {
        const emailContent = appointmentReminderEmail({
          customerName: validatedData.customerName,
          serviceName: validatedData.serviceType,
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
          shopName: shop.name,
          shopAddress: shop.address || undefined,
          shopPhone: shop.phone || undefined,
        });

        await sendEmail({
          to: validatedData.customerEmail,
          subject: `Booking Confirmed - ${shop.name}`,
          html: emailContent.html,
        });
      } catch (emailError) {
        console.error('Email send error (non-blocking):', emailError);
        // Don't fail the booking if email fails
      }
    }

    // Send confirmation SMS
    try {
      const smsBody = bookingConfirmationSms({
        customerName: validatedData.customerName,
        serviceName: validatedData.serviceType,
        scheduledDate: formattedDate,
        scheduledTime: formattedTime,
        shopName: shop.name,
        shopAddress: shop.address || undefined,
      });

      await sendSms({
        to: validatedData.customerPhone,
        body: smsBody,
      });
    } catch (smsError) {
      console.error('SMS send error (non-blocking):', smsError);
      // Don't fail the booking if SMS fails
    }

    return NextResponse.json({
      success: true,
      bookingId: workOrder.id,
      message: 'Booking confirmed',
      details: {
        shopName: shop.name,
        service: validatedData.serviceType,
        date: formattedDate,
        time: formattedTime,
        address: shop.address,
        phone: shop.phone,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Booking API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
