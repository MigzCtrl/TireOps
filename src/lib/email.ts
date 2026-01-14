import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Use Resend's test address until you verify your own domain
const FROM_EMAIL = process.env.EMAIL_FROM || 'TireOps <onboarding@resend.dev>';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailParams) {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      console.error('Email send error:', error);
      throw new Error(error.message);
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Email Templates

export function orderConfirmationEmail({
  customerName,
  orderNumber,
  serviceName,
  scheduledDate,
  shopName,
  shopPhone,
}: {
  customerName: string;
  orderNumber: string;
  serviceName: string;
  scheduledDate: string;
  shopName: string;
  shopPhone?: string;
}) {
  const subject = `Order Confirmation - ${orderNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${shopName}</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #18181b; margin: 0 0 16px;">Order Confirmed!</h2>
            <p style="color: #52525b; line-height: 1.6; margin: 0 0 24px;">
              Hi ${customerName},<br><br>
              Thank you for your order! Here are the details:
            </p>
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px;"><strong>Order #:</strong> ${orderNumber}</p>
              <p style="margin: 0 0 8px;"><strong>Service:</strong> ${serviceName}</p>
              <p style="margin: 0;"><strong>Scheduled Date:</strong> ${scheduledDate}</p>
            </div>
            <p style="color: #52525b; line-height: 1.6; margin: 0;">
              If you have any questions, please contact us${shopPhone ? ` at ${shopPhone}` : ''}.
            </p>
          </div>
          <div style="background-color: #f4f4f5; padding: 16px; text-align: center;">
            <p style="color: #71717a; font-size: 12px; margin: 0;">
              This email was sent by ${shopName} via TireOps
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html };
}

export function appointmentReminderEmail({
  customerName,
  serviceName,
  scheduledDate,
  scheduledTime,
  shopName,
  shopAddress,
  shopPhone,
}: {
  customerName: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime?: string;
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
}) {
  const subject = `Appointment Reminder - ${scheduledDate}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Reminder</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #52525b; line-height: 1.6; margin: 0 0 24px;">
              Hi ${customerName},<br><br>
              This is a friendly reminder about your upcoming appointment at ${shopName}.
            </p>
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px;"><strong>Service:</strong> ${serviceName}</p>
              <p style="margin: 0 0 8px;"><strong>Date:</strong> ${scheduledDate}</p>
              ${scheduledTime ? `<p style="margin: 0 0 8px;"><strong>Time:</strong> ${scheduledTime}</p>` : ''}
              ${shopAddress ? `<p style="margin: 0;"><strong>Location:</strong> ${shopAddress}</p>` : ''}
            </div>
            <p style="color: #52525b; line-height: 1.6; margin: 0;">
              If you need to reschedule, please contact us${shopPhone ? ` at ${shopPhone}` : ''}.
            </p>
          </div>
          <div style="background-color: #f4f4f5; padding: 16px; text-align: center;">
            <p style="color: #71717a; font-size: 12px; margin: 0;">
              This email was sent by ${shopName} via TireOps
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html };
}

export function teamInviteEmail({
  inviteeName,
  inviterName,
  shopName,
  inviteLink,
  role,
}: {
  inviteeName?: string;
  inviterName: string;
  shopName: string;
  inviteLink: string;
  role: string;
}) {
  const subject = `You've been invited to join ${shopName}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Team Invitation</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #52525b; line-height: 1.6; margin: 0 0 24px;">
              Hi${inviteeName ? ` ${inviteeName}` : ''},<br><br>
              ${inviterName} has invited you to join <strong>${shopName}</strong> on TireOps as a <strong>${role}</strong>.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0;">
              This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          <div style="background-color: #f4f4f5; padding: 16px; text-align: center;">
            <p style="color: #71717a; font-size: 12px; margin: 0;">
              Powered by TireOps
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html };
}

export function lowStockAlertEmail({
  shopName,
  items,
  dashboardLink,
}: {
  shopName: string;
  items: Array<{ name: string; currentStock: number; threshold: number }>;
  dashboardLink: string;
}) {
  const subject = `Low Stock Alert - ${items.length} item${items.length > 1 ? 's' : ''} need attention`;
  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: center; color: #dc2626;">${item.currentStock}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: center;">${item.threshold}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="background-color: #dc2626; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Low Stock Alert</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: #52525b; line-height: 1.6; margin: 0 0 24px;">
              The following items at <strong>${shopName}</strong> are running low on stock:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background-color: #f4f4f5;">
                  <th style="padding: 12px; text-align: left;">Item</th>
                  <th style="padding: 12px; text-align: center;">Current</th>
                  <th style="padding: 12px; text-align: center;">Threshold</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div style="text-align: center;">
              <a href="${dashboardLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Inventory
              </a>
            </div>
          </div>
          <div style="background-color: #f4f4f5; padding: 16px; text-align: center;">
            <p style="color: #71717a; font-size: 12px; margin: 0;">
              This email was sent by ${shopName} via TireOps
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html };
}
