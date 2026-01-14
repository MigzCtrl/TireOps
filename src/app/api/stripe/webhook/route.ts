import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, PRICING_TIERS, PricingTier } from '@/lib/stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getWebhookRateLimiter, checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Lazy initialization for Supabase admin client
let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }
    supabaseAdminInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseAdminInstance;
}

function getWebhookSecret(): string {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
}

// Determine tier from price ID
function getTierFromPriceId(priceId: string): PricingTier | null {
  for (const [key, value] of Object.entries(PRICING_TIERS)) {
    if (value.priceId === priceId) {
      return key as PricingTier;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret());
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateLimitResponse = await checkRateLimit(
      getWebhookRateLimiter(),
      getClientIp(request)
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Idempotency check - skip if already processed
    const supabase = getSupabaseAdmin();
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', event.id)
      .single();

    if (existingEvent) {
      console.log(`Skipping already processed event: ${event.id}`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // Record event as being processed
    await supabase.from('webhook_events').insert({
      event_id: event.id,
      event_type: event.type,
    });

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const shopId = session.metadata?.shop_id;

        if (shopId && session.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const priceId = subscription.items.data[0]?.price.id;
          const tier = getTierFromPriceId(priceId);

          // Get current period end (handle both old and new Stripe API structures)
          const periodEnd = 'current_period_end' in subscription
            ? (subscription as unknown as { current_period_end: number }).current_period_end
            : null;

          // Update shop subscription status
          await getSupabaseAdmin()
            .from('shops')
            .update({
              subscription_status: 'active',
              subscription_tier: tier,
              subscription_id: subscription.id,
              subscription_current_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
            })
            .eq('id', shopId);

          console.log(`Subscription activated for shop ${shopId}: ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const shopId = subscription.metadata?.shop_id;

        if (shopId) {
          const priceId = subscription.items.data[0]?.price.id;
          const tier = getTierFromPriceId(priceId);

          // Get current period end
          const periodEnd = 'current_period_end' in subscription
            ? (subscription as unknown as { current_period_end: number }).current_period_end
            : null;

          await getSupabaseAdmin()
            .from('shops')
            .update({
              subscription_status: subscription.status,
              subscription_tier: tier,
              subscription_current_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
            })
            .eq('id', shopId);

          console.log(`Subscription updated for shop ${shopId}: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const shopId = subscription.metadata?.shop_id;

        if (shopId) {
          await getSupabaseAdmin()
            .from('shops')
            .update({
              subscription_status: 'canceled',
              subscription_tier: null,
              subscription_id: null,
              subscription_current_period_end: null,
            })
            .eq('id', shopId);

          console.log(`Subscription canceled for shop ${shopId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        // Handle different Stripe API versions for subscription field
        const subscriptionId = 'subscription' in invoice
          ? (invoice as unknown as { subscription: string }).subscription
          : null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const shopId = subscription.metadata?.shop_id;

          if (shopId) {
            await getSupabaseAdmin()
              .from('shops')
              .update({
                subscription_status: 'past_due',
              })
              .eq('id', shopId);

            console.log(`Payment failed for shop ${shopId}`);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        // Handle different Stripe API versions
        const subscriptionId = 'subscription' in invoice
          ? (invoice as unknown as { subscription: string }).subscription
          : null;
        const billingReason = 'billing_reason' in invoice
          ? (invoice as unknown as { billing_reason: string }).billing_reason
          : null;

        if (subscriptionId && billingReason === 'subscription_cycle') {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const shopId = subscription.metadata?.shop_id;

          if (shopId) {
            // Get current period end
            const periodEnd = 'current_period_end' in subscription
              ? (subscription as unknown as { current_period_end: number }).current_period_end
              : null;

            await getSupabaseAdmin()
              .from('shops')
              .update({
                subscription_status: 'active',
                subscription_current_period_end: periodEnd
                  ? new Date(periodEnd * 1000).toISOString()
                  : null,
              })
              .eq('id', shopId);

            console.log(`Payment succeeded for shop ${shopId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
