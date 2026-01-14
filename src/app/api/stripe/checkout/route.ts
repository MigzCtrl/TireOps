import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createCheckoutSession,
  getOrCreateStripeCustomer,
  PRICING_TIERS,
  PricingTier,
} from '@/lib/stripe';

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

    const body = await request.json();
    const { tier } = body as { tier: PricingTier };

    if (!tier || !PRICING_TIERS[tier]) {
      return NextResponse.json(
        { error: 'Invalid pricing tier' },
        { status: 400 }
      );
    }

    // Get shop info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.shop_id) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Get shop details
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, name, stripe_customer_id')
      .eq('id', profile.shop_id)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId = shop.stripe_customer_id;

    if (!stripeCustomerId) {
      stripeCustomerId = await getOrCreateStripeCustomer(
        user.email || '',
        shop.id,
        shop.name
      );

      // Save customer ID to shop
      await supabase
        .from('shops')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', shop.id);
    }

    // Create checkout session
    const priceId = PRICING_TIERS[tier].priceId;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Pricing not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const origin = request.headers.get('origin') || '';

    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId,
      shopId: shop.id,
      successUrl: `${origin}/settings?subscription=success`,
      cancelUrl: `${origin}/pricing?subscription=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
