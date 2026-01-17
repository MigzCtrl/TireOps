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
    console.log('[email] Sending email via Resend:', { from: FROM_EMAIL, to, subject });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
    });

    console.log('[email] Resend response:', { data, error });

    if (error) {
      console.error('[email] Resend API error:', error);
      throw new Error(error.message);
    }

    console.log('[email] Email sent successfully, ID:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('[email] Failed to send email:', error);
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

export function paymentWelcomeEmail({
  customerEmail,
  tier,
  signupLink,
  billingCycle = 'monthly',
}: {
  customerEmail: string;
  tier: string;
  signupLink: string;
  billingCycle?: 'monthly' | 'yearly' | string;
}) {
  const tierNames: Record<string, string> = {
    basic: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };
  const tierName = tierNames[tier] || 'Pro';
  const billingLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';

  const subject = `Welcome to TireOps - Complete Your Account Setup`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; margin: 0; padding: 40px 20px;">
        <div style="max-width: 520px; margin: 0 auto;">
          <!-- Logo Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 16px 24px; border-radius: 12px;">
              <span style="color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">TireOps</span>
            </div>
          </div>

          <!-- Main Card -->
          <div style="background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
            <!-- Success Header -->
            <div style="background-color: #0f172a; padding: 32px; text-align: center; border-bottom: 1px solid #334155;">
              <div style="display: inline-block; background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 50px; padding: 8px 20px; margin-bottom: 16px;">
                <span style="color: #22c55e; font-size: 14px; font-weight: 500;">Payment Successful</span>
              </div>
              <h1 style="color: #f1f5f9; margin: 0; font-size: 24px; font-weight: 600;">Welcome to TireOps</h1>
              <p style="color: #64748b; margin: 12px 0 0; font-size: 15px;">Your ${tierName} subscription is now active</p>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
              <!-- Plan Details -->
              <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px solid #334155;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #94a3b8; font-size: 14px; padding: 8px 0;">Plan</td>
                    <td style="color: #f1f5f9; font-size: 14px; font-weight: 500; text-align: right; padding: 8px 0;">${tierName}</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; font-size: 14px; padding: 8px 0;">Billing</td>
                    <td style="color: #f1f5f9; font-size: 14px; text-align: right; padding: 8px 0;">${billingLabel}</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; font-size: 14px; padding: 8px 0;">Status</td>
                    <td style="text-align: right; padding: 8px 0;">
                      <span style="background-color: rgba(34, 197, 94, 0.1); color: #22c55e; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 4px;">Active</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; font-size: 14px; padding: 8px 0;">Account</td>
                    <td style="color: #f1f5f9; font-size: 14px; text-align: right; padding: 8px 0;">${customerEmail}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Section -->
              <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                One last step - create your account to access your dashboard.
              </p>

              <div style="text-align: center;">
                <a href="${signupLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                  Create Account
                </a>
              </div>

              <!-- Security Note -->
              <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid #334155; text-align: center;">
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: middle;">
                    <path d="M12 2L4 6v6c0 5.5 3.4 10.3 8 12 4.6-1.7 8-6.5 8-12V6l-8-4z" fill="#22c55e" opacity="0.2"/>
                    <path d="M12 2L4 6v6c0 5.5 3.4 10.3 8 12 4.6-1.7 8-6.5 8-12V6l-8-4z" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M9 12l2 2 4-4" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span style="color: #64748b; font-size: 13px;">Secured by Stripe</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #475569; font-size: 13px; margin: 0 0 8px;">
              Need help? <a href="mailto:support@tireops.xyz" style="color: #3b82f6; text-decoration: none;">Contact Support</a>
            </p>
            <p style="color: #334155; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} TireOps. All rights reserved.
            </p>
          </div>

          <!-- Fallback Link -->
          <div style="margin-top: 24px; text-align: center;">
            <p style="color: #475569; font-size: 11px; line-height: 1.5; margin: 0;">
              Button not working? Copy this link:<br>
              <a href="${signupLink}" style="color: #64748b; word-break: break-all; font-size: 10px;">${signupLink}</a>
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
