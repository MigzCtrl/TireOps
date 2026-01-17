import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICING_TIERS, PricingTier, BillingCycle, getPrice } from '@/lib/stripe';

// Product display info for Stripe checkout
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
    const { tier, billingCycle = 'monthly' } = body as { tier: PricingTier; billingCycle?: BillingCycle };

    if (!tier || !PRICING_TIERS[tier]) {
      return NextResponse.json(
        { error: 'Invalid pricing tier' },
        { status: 400 }
      );
    }

    const price = getPrice(tier, billingCycle);
    const productInfo = PRODUCT_INFO[tier];
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create embedded checkout session with custom product data
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productInfo.name,
              description: productInfo.description,
            },
            unit_amount: price * 100, // Stripe uses cents
            recurring: {
              interval: billingCycle === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      return_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&billing=${billingCycle}`,
      metadata: {
        tier,
        billingCycle,
        source: 'embedded_checkout',
      },
      subscription_data: {
        metadata: {
          tier,
          billingCycle,
          source: 'embedded_checkout',
        },
      },
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Embedded checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
