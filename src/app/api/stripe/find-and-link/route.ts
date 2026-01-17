import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, PricingTier } from '@/lib/stripe';

// Find a Stripe customer by email and link their subscription to the shop
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

    // Get user's shop
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.shop_id || profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only shop owners can link subscriptions' },
        { status: 403 }
      );
    }

    const shopId = profile.shop_id;

    // Check if shop already has a subscription
    const { data: shop } = await supabase
      .from('shops')
      .select('stripe_customer_id, subscription_status')
      .eq('id', shopId)
      .single();

    if (shop?.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'Shop already has an active subscription' },
        { status: 400 }
      );
    }

    // Search for Stripe customers by user's email
    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    console.log('[find-and-link] Searching for Stripe customer with email:', email);

    // Find customers by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No Stripe customer found with your email. Please contact support.' },
        { status: 404 }
      );
    }

    // Try to find an active subscription among all customers
    let foundSubscription: any = null;
    let foundCustomer: any = null;
    let tier: PricingTier = 'starter';

    for (const customer of customers.data) {
      // Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        foundSubscription = subscriptions.data[0];
        foundCustomer = customer;
        break;
      }

      // Check for trialing subscriptions
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'trialing',
        limit: 1,
      });

      if (trialingSubscriptions.data.length > 0) {
        foundSubscription = trialingSubscriptions.data[0];
        foundCustomer = customer;
        break;
      }

      // Check for successful payment intents (one-time payments)
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 5,
      });

      const successfulPayment = paymentIntents.data.find(pi => pi.status === 'succeeded');
      if (successfulPayment) {
        foundCustomer = customer;
        tier = (successfulPayment.metadata?.tier as PricingTier) ||
               (customer.metadata?.tier as PricingTier) || 'basic';
        break;
      }
    }

    if (!foundCustomer) {
      return NextResponse.json(
        { error: 'No payment found for your email. Please contact support.' },
        { status: 404 }
      );
    }

    console.log('[find-and-link] Found customer:', foundCustomer.id, 'Subscription:', foundSubscription?.id);

    // Get tier from subscription or metadata
    if (foundSubscription?.metadata?.tier) {
      tier = foundSubscription.metadata.tier as PricingTier;
    } else if (foundCustomer.metadata?.tier) {
      tier = foundCustomer.metadata.tier as PricingTier;
    }

    // Update the shop with subscription details
    const updateData: any = {
      stripe_customer_id: foundCustomer.id,
      subscription_status: 'active',
      subscription_tier: tier,
    };

    if (foundSubscription) {
      updateData.subscription_id = foundSubscription.id;
      updateData.subscription_current_period_end = foundSubscription.current_period_end
        ? new Date(foundSubscription.current_period_end * 1000).toISOString()
        : null;

      // Update subscription metadata with shop_id
      await stripe.subscriptions.update(foundSubscription.id, {
        metadata: {
          shop_id: shopId,
          tier,
        },
      });
    } else {
      // For one-time payments, set period end to 1 year from now
      updateData.subscription_current_period_end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error: updateError } = await supabase
      .from('shops')
      .update(updateData)
      .eq('id', shopId);

    if (updateError) {
      console.error('Failed to update shop subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to link subscription to shop' },
        { status: 500 }
      );
    }

    console.log('[find-and-link] Successfully linked subscription to shop:', shopId);

    return NextResponse.json({
      success: true,
      tier,
      subscriptionId: foundSubscription?.id,
      customerId: foundCustomer.id,
    });
  } catch (error) {
    console.error('Find and link error:', error);
    return NextResponse.json(
      { error: 'Failed to find and link subscription' },
      { status: 500 }
    );
  }
}
