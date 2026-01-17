import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICING_TIERS, PricingTier, BillingCycle, getPrice } from '@/lib/stripe';

// Product info for dynamic price creation
const PRODUCT_INFO = {
  starter: {
    name: 'TireOps Starter',
    description: 'Perfect for getting started (free)',
  },
  pro: {
    name: 'TireOps Pro',
    description: 'For growing tire shops with advanced features',
  },
  enterprise: {
    name: 'TireOps Enterprise',
    description: 'Full-featured solution for multi-location businesses',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tier, billingCycle = 'monthly', email } = body as {
      tier: PricingTier;
      billingCycle?: BillingCycle;
      email?: string;
    };

    if (!tier || !PRICING_TIERS[tier]) {
      return NextResponse.json(
        { error: 'Invalid pricing tier' },
        { status: 400 }
      );
    }

    const price = getPrice(tier, billingCycle);
    const productInfo = PRODUCT_INFO[tier];

    // Create customer first with email
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: {
        tier,
        billingCycle,
      },
    });

    // Create a PaymentIntent for the first payment
    // This will collect the payment method and charge immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price * 100,
      currency: 'usd',
      customer: customer.id,
      receipt_email: email || undefined,
      setup_future_usage: 'off_session', // Save payment method for future charges
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        tier,
        billingCycle,
        productName: productInfo.name,
        source: 'elements_checkout',
        type: 'subscription_initial_payment',
        email: email || '',
      },
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json(
        { error: 'Failed to create payment intent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
