import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, PRICING_TIERS, PricingTier } from '@/lib/stripe';

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
    const { checkoutSessionId, shopId, tier: providedTier } = body;

    if (!checkoutSessionId || !shopId) {
      return NextResponse.json(
        { error: 'Missing checkoutSessionId or shopId' },
        { status: 400 }
      );
    }

    let subscription: any = null;
    let customerId: string | null = null;
    let tier: PricingTier = (providedTier as PricingTier) || 'basic';

    // Check if this is a PaymentIntent ID (pi_*) or Checkout Session ID (cs_*)
    if (checkoutSessionId.startsWith('pi_')) {
      // Handle PaymentIntent from Elements checkout
      console.log('[link-subscription] Processing PaymentIntent:', checkoutSessionId);

      const paymentIntent = await stripe.paymentIntents.retrieve(checkoutSessionId);
      customerId = paymentIntent.customer as string;

      // Get tier from payment intent metadata
      if (paymentIntent.metadata?.tier) {
        tier = paymentIntent.metadata.tier as PricingTier;
      }

      // Try to find subscription by customer
      if (customerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0];
        } else {
          // Check for trialing subscriptions
          const trialingSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'trialing',
            limit: 1,
          });
          if (trialingSubscriptions.data.length > 0) {
            subscription = trialingSubscriptions.data[0];
          }
        }
      }

      // If no subscription found, this might be a one-time payment
      // Still update shop with payment info
      if (!subscription) {
        console.log('[link-subscription] No subscription found for PaymentIntent, updating shop with payment info');

        const { error: updateError } = await supabase
          .from('shops')
          .update({
            subscription_status: 'active',
            subscription_tier: tier,
            stripe_customer_id: customerId,
            // Set period end to 1 year from now for one-time payments
            subscription_current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', shopId);

        if (updateError) {
          console.error('Failed to update shop subscription:', updateError);
          return NextResponse.json(
            { error: 'Failed to update shop subscription' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          tier,
          paymentIntentId: checkoutSessionId,
        });
      }
    } else {
      // Handle Checkout Session ID (original flow)
      console.log('[link-subscription] Processing Checkout Session:', checkoutSessionId);

      const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ['subscription'],
      });

      if (!session.subscription) {
        return NextResponse.json(
          { error: 'No subscription found for this checkout session' },
          { status: 400 }
        );
      }

      subscription = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

      customerId = session.customer as string;

      // Get tier from session metadata
      if (session.metadata?.tier) {
        tier = session.metadata.tier as PricingTier;
      }
    }

    // Get current period end from subscription
    const periodEnd = subscription?.current_period_end || null;

    // Update the subscription metadata with the shop_id if we have a subscription
    if (subscription) {
      await stripe.subscriptions.update(subscription.id, {
        metadata: {
          shop_id: shopId,
          tier,
        },
      });
    }

    // Update the shop with subscription details
    const { error: updateError } = await supabase
      .from('shops')
      .update({
        subscription_status: 'active',
        subscription_tier: tier,
        subscription_id: subscription?.id || null,
        stripe_customer_id: customerId,
        subscription_current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      })
      .eq('id', shopId);

    if (updateError) {
      console.error('Failed to update shop subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update shop subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tier,
      subscriptionId: subscription?.id,
    });
  } catch (error) {
    console.error('Link subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to link subscription' },
      { status: 500 }
    );
  }
}
