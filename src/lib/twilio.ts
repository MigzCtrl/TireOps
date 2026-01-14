import Twilio from 'twilio';

// Lazy initialization to avoid build-time errors
let twilioClient: Twilio.Twilio | null = null;

function getTwilio(): Twilio.Twilio {
  if (!twilioClient) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Missing Twilio credentials');
    }
    twilioClient = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
}

function getFromNumber(): string {
  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error('Missing TWILIO_PHONE_NUMBER environment variable');
  }
  return process.env.TWILIO_PHONE_NUMBER;
}

export interface SendSmsParams {
  to: string;
  body: string;
}

export async function sendSms({ to, body }: SendSmsParams) {
  try {
    const client = getTwilio();
    const message = await client.messages.create({
      body,
      from: getFromNumber(),
      to: formatPhoneNumber(to),
    });

    return {
      success: true,
      sid: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error('SMS send error:', error);
    throw error;
  }
}

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If starts with 1, assume US/Canada
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If 10 digits, assume US/Canada and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Otherwise return with + prefix
  return `+${digits}`;
}

// SMS Templates

export function appointmentReminderSms({
  customerName,
  serviceName,
  scheduledDate,
  scheduledTime,
  shopName,
  shopPhone,
}: {
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime?: string;
  shopName: string;
  shopPhone?: string;
}): string {
  const timeStr = scheduledTime ? ` at ${scheduledTime}` : '';
  const phoneStr = shopPhone ? ` Call ${shopPhone} to reschedule.` : '';

  return `Hi ${customerName}! Reminder: Your ${serviceName} appointment at ${shopName} is scheduled for ${scheduledDate}${timeStr}.${phoneStr}`;
}

export function orderConfirmationSms({
  customerName,
  orderNumber,
  serviceName,
  scheduledDate,
  shopName,
}: {
  customerName: string;
  orderNumber: string;
  serviceName: string;
  scheduledDate: string;
  shopName: string;
}): string {
  return `Hi ${customerName}! Your order #${orderNumber} for ${serviceName} at ${shopName} is confirmed for ${scheduledDate}. We'll see you then!`;
}

export function orderStatusUpdateSms({
  customerName,
  orderNumber,
  status,
  shopName,
  shopPhone,
}: {
  customerName: string;
  orderNumber: string;
  status: 'in_progress' | 'ready' | 'completed';
  shopName: string;
  shopPhone?: string;
}): string {
  const statusMessages: Record<string, string> = {
    in_progress: `Your vehicle is now being serviced`,
    ready: `Your vehicle is ready for pickup`,
    completed: `Your service has been completed. Thank you for choosing us`,
  };

  const phoneStr = shopPhone ? ` Call ${shopPhone} with any questions.` : '';
  return `Hi ${customerName}! ${statusMessages[status]} for order #${orderNumber} at ${shopName}.${phoneStr}`;
}

export function bookingConfirmationSms({
  customerName,
  serviceName,
  scheduledDate,
  scheduledTime,
  shopName,
  shopAddress,
}: {
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime?: string;
  shopName: string;
  shopAddress?: string;
}): string {
  const timeStr = scheduledTime ? ` at ${scheduledTime}` : '';
  const addressStr = shopAddress ? ` Location: ${shopAddress}` : '';

  return `Hi ${customerName}! Your ${serviceName} appointment at ${shopName} is booked for ${scheduledDate}${timeStr}.${addressStr}`;
}
