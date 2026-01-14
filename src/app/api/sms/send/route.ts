import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendSms,
  appointmentReminderSms,
  orderConfirmationSms,
  orderStatusUpdateSms,
  bookingConfirmationSms,
} from '@/lib/twilio';

type SmsType = 'appointment_reminder' | 'order_confirmation' | 'order_status' | 'booking_confirmation';

interface SmsRequestBody {
  type: SmsType;
  to: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as SmsRequestBody;
    const { type, to, data } = body;

    if (!type || !to || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, to, data' },
        { status: 400 }
      );
    }

    // Get shop info for SMS templates
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    const { data: shop } = await supabase
      .from('shops')
      .select('name, address, phone')
      .eq('id', profile?.shop_id)
      .single();

    let smsBody: string;

    switch (type) {
      case 'appointment_reminder':
        smsBody = appointmentReminderSms({
          customerName: data.customerName as string,
          serviceName: data.serviceName as string,
          scheduledDate: data.scheduledDate as string,
          scheduledTime: data.scheduledTime as string | undefined,
          shopName: shop?.name || 'Tire Shop',
          shopPhone: shop?.phone || undefined,
        });
        break;

      case 'order_confirmation':
        smsBody = orderConfirmationSms({
          customerName: data.customerName as string,
          orderNumber: data.orderNumber as string,
          serviceName: data.serviceName as string,
          scheduledDate: data.scheduledDate as string,
          shopName: shop?.name || 'Tire Shop',
        });
        break;

      case 'order_status':
        smsBody = orderStatusUpdateSms({
          customerName: data.customerName as string,
          orderNumber: data.orderNumber as string,
          status: data.status as 'in_progress' | 'ready' | 'completed',
          shopName: shop?.name || 'Tire Shop',
          shopPhone: shop?.phone || undefined,
        });
        break;

      case 'booking_confirmation':
        smsBody = bookingConfirmationSms({
          customerName: data.customerName as string,
          serviceName: data.serviceName as string,
          scheduledDate: data.scheduledDate as string,
          scheduledTime: data.scheduledTime as string | undefined,
          shopName: shop?.name || 'Tire Shop',
          shopAddress: shop?.address || undefined,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid SMS type' },
          { status: 400 }
        );
    }

    const result = await sendSms({ to, body: smsBody });

    return NextResponse.json(result);
  } catch (error) {
    console.error('SMS API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
