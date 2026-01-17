import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { sendEmail, paymentWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, paymentIntentId, email: providedEmail } = body;

    console.log('[send-welcome-email] Request received:', { sessionId, paymentIntentId, providedEmail });

    let customerEmail: string | null = null;
    let tier = 'pro';
    let billingCycle = 'monthly';
    let paymentRef = '';

    // Handle PaymentIntent (Elements checkout)
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { success: false, error: 'Payment not completed' },
          { status: 400 }
        );
      }

      // Get email from: provided email > metadata > receipt_email
      customerEmail = providedEmail ||
        paymentIntent.metadata?.email ||
        paymentIntent.receipt_email ||
        null;

      tier = paymentIntent.metadata?.tier || 'pro';
      billingCycle = paymentIntent.metadata?.billingCycle || 'monthly';
      paymentRef = paymentIntentId;
    }
    // Handle Checkout Session (legacy)
    else if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer'],
      });

      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          { success: false, error: 'Payment not completed' },
          { status: 400 }
        );
      }

      const customer = session.customer;
      customerEmail = session.customer_details?.email ||
        (typeof customer === 'object' && customer && 'email' in customer && !('deleted' in customer) ? customer.email : null);

      if (session.metadata?.welcome_email_sent === 'true') {
        return NextResponse.json({
          success: true,
          alreadySent: true,
          message: 'Welcome email was already sent',
        });
      }

      tier = session.metadata?.tier || 'pro';
      paymentRef = sessionId;
    } else {
      return NextResponse.json(
        { success: false, error: 'No session ID or payment intent provided' },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: 'No customer email found' },
        { status: 400 }
      );
    }

    // Build the signup link
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://tireops.xyz';
    const signupLink = `${origin}/register?payment_ref=${paymentRef}&tier=${tier}&billing=${billingCycle}&email=${encodeURIComponent(customerEmail)}`;

    console.log('[send-welcome-email] Preparing email:', { customerEmail, tier, origin, signupLink });

    // Generate and send the welcome email
    const { subject, html } = paymentWelcomeEmail({
      customerEmail,
      tier,
      signupLink,
      billingCycle,
    });

    console.log('[send-welcome-email] Sending email to:', customerEmail, 'with subject:', subject);
    console.log('[send-welcome-email] EMAIL_FROM env:', process.env.EMAIL_FROM);

    const emailResult = await sendEmail({
      to: customerEmail,
      subject,
      html,
    });

    console.log('[send-welcome-email] Email sent successfully:', emailResult);

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
      email: customerEmail,
    });
  } catch (error) {
    console.error('[send-welcome-email] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send welcome email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
