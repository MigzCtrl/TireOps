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
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';

    // Logo URL - use your hosted logo
    const logoUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`
      : `${origin}/logo.png`;

    // Create checkout session with custom product data for better display
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productInfo.name,
              description: productInfo.description,
              images: [logoUrl],
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
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&billing=${billingCycle}`,
      cancel_url: `${origin}/checkout/${tier}?checkout=cancelled`,
      metadata: {
        tier,
        billingCycle,
        source: 'public_checkout',
      },
      subscription_data: {
        metadata: {
          tier,
          billingCycle,
          source: 'public_checkout',
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Public checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Also support GET for direct linking
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get('tier') as PricingTier;
  const billingCycle = (searchParams.get('billing') || 'monthly') as BillingCycle;

  if (!tier || !PRICING_TIERS[tier]) {
    return NextResponse.redirect(new URL('/?error=invalid_tier', request.url));
  }

  const price = getPrice(tier, billingCycle);
  const productInfo = PRODUCT_INFO[tier];
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  const logoUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`
    : `${origin}/logo.png`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productInfo.name,
              description: productInfo.description,
              images: [logoUrl],
            },
            unit_amount: price * 100,
            recurring: {
              interval: billingCycle === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&billing=${billingCycle}`,
      cancel_url: `${origin}/checkout/${tier}?checkout=cancelled`,
      metadata: {
        tier,
        billingCycle,
        source: 'public_checkout',
      },
      subscription_data: {
        metadata: {
          tier,
          billingCycle,
          source: 'public_checkout',
        },
      },
    });

    return NextResponse.redirect(session.url!);
  } catch (error) {
    console.error('Public checkout error:', error);
    return NextResponse.redirect(new URL('/?error=checkout_failed', request.url));
  }
}
