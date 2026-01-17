import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, paymentIntentId } = body;

    // Handle PaymentIntent verification (from Elements checkout)
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { success: false, error: 'Payment not completed' },
          { status: 400 }
        );
      }

      // Get tier, billing, and email from metadata
      const tier = paymentIntent.metadata?.tier || 'pro';
      const billingCycle = paymentIntent.metadata?.billingCycle || 'monthly';
      const customerEmail = paymentIntent.metadata?.email || paymentIntent.receipt_email || '';

      return NextResponse.json({
        success: true,
        tier,
        billingCycle,
        customerEmail,
        customerId: typeof paymentIntent.customer === 'string'
          ? paymentIntent.customer
          : paymentIntent.customer?.id,
        paymentIntentId: paymentIntent.id,
      });
    }

    // Handle Checkout Session verification (legacy)
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'No session ID or payment intent provided' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if this session has already been used to create an account
    const { data: usedSession } = await supabase
      .from('used_checkout_sessions')
      .select('id, used_at')
      .eq('session_id', sessionId)
      .single();

    if (usedSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'This payment has already been used to create an account. Please purchase a new subscription.',
          alreadyUsed: true
        },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Get customer email
    const customer = session.customer;
    const customerEmail = session.customer_details?.email ||
      (typeof customer === 'object' && customer && 'email' in customer && !('deleted' in customer) ? customer.email : null);

    // Get tier from metadata
    const tier = session.metadata?.tier || 'pro';

    return NextResponse.json({
      success: true,
      tier,
      customerEmail,
      subscriptionId: typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);

    // Handle case where table doesn't exist yet (graceful degradation)
    if (error?.code === '42P01') {
      // Table doesn't exist, fall back to basic verification
      try {
        const body = await request.json();

        if (body.paymentIntentId) {
          const paymentIntent = await stripe.paymentIntents.retrieve(body.paymentIntentId);
          if (paymentIntent.status === 'succeeded') {
            return NextResponse.json({
              success: true,
              tier: paymentIntent.metadata?.tier || 'pro',
              billingCycle: paymentIntent.metadata?.billingCycle || 'monthly',
            });
          }
        }

        const session = await stripe.checkout.sessions.retrieve(body.sessionId, {
          expand: ['customer', 'subscription'],
        });

        if (session.payment_status !== 'paid') {
          return NextResponse.json(
            { success: false, error: 'Payment not completed' },
            { status: 400 }
          );
        }

        const fallbackCustomer = session.customer;
        const customerEmail = session.customer_details?.email ||
          (typeof fallbackCustomer === 'object' && fallbackCustomer && 'email' in fallbackCustomer && !('deleted' in fallbackCustomer) ? fallbackCustomer.email : null);
        const tier = session.metadata?.tier || 'pro';

        return NextResponse.json({
          success: true,
          tier,
          customerEmail,
          subscriptionId: typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id,
        });
      } catch (fallbackError) {
        return NextResponse.json(
          { success: false, error: 'Failed to verify payment' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
