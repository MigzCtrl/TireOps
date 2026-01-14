import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendEmail,
  orderConfirmationEmail,
  appointmentReminderEmail,
  teamInviteEmail,
  lowStockAlertEmail,
} from '@/lib/email';

type EmailType = 'order_confirmation' | 'appointment_reminder' | 'team_invite' | 'low_stock_alert';

interface EmailRequestBody {
  type: EmailType;
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

    const body = await request.json() as EmailRequestBody;
    const { type, to, data } = body;

    if (!type || !to || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, to, data' },
        { status: 400 }
      );
    }

    // Get shop info for email templates
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    const { data: shop } = await supabase
      .from('shops')
      .select('name, address, phone, email')
      .eq('id', profile?.shop_id)
      .single();

    let emailContent: { subject: string; html: string };

    switch (type) {
      case 'order_confirmation':
        emailContent = orderConfirmationEmail({
          customerName: data.customerName as string,
          orderNumber: data.orderNumber as string,
          serviceName: data.serviceName as string,
          scheduledDate: data.scheduledDate as string,
          shopName: shop?.name || 'Tire Shop',
          shopPhone: shop?.phone || undefined,
        });
        break;

      case 'appointment_reminder':
        emailContent = appointmentReminderEmail({
          customerName: data.customerName as string,
          serviceName: data.serviceName as string,
          scheduledDate: data.scheduledDate as string,
          scheduledTime: data.scheduledTime as string | undefined,
          shopName: shop?.name || 'Tire Shop',
          shopAddress: shop?.address || undefined,
          shopPhone: shop?.phone || undefined,
        });
        break;

      case 'team_invite':
        emailContent = teamInviteEmail({
          inviteeName: data.inviteeName as string | undefined,
          inviterName: data.inviterName as string,
          shopName: shop?.name || 'Tire Shop',
          inviteLink: data.inviteLink as string,
          role: data.role as string,
        });
        break;

      case 'low_stock_alert':
        emailContent = lowStockAlertEmail({
          shopName: shop?.name || 'Tire Shop',
          items: data.items as Array<{ name: string; currentStock: number; threshold: number }>,
          dashboardLink: data.dashboardLink as string,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    const result = await sendEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      replyTo: shop?.email || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
