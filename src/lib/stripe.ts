import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

export const stripe = {
  get instance() {
    return getStripe();
  },
  subscriptions: {
    list: (params: Stripe.SubscriptionListParams) => getStripe().subscriptions.list(params),
    retrieve: (id: string) => getStripe().subscriptions.retrieve(id),
  },
  customers: {
    search: (params: Stripe.CustomerSearchParams) => getStripe().customers.search(params),
    create: (params: Stripe.CustomerCreateParams) => getStripe().customers.create(params),
  },
  checkout: {
    sessions: {
      create: (params: Stripe.Checkout.SessionCreateParams) => getStripe().checkout.sessions.create(params),
    },
  },
  billingPortal: {
    sessions: {
      create: (params: Stripe.BillingPortal.SessionCreateParams) => getStripe().billingPortal.sessions.create(params),
    },
  },
  webhooks: {
    constructEvent: (body: string, signature: string, secret: string) =>
      getStripe().webhooks.constructEvent(body, signature, secret),
  },
};

// Pricing tiers
export const PRICING_TIERS = {
  basic: {
    name: 'Basic',
    description: 'Perfect for small shops',
    price: 29,
    priceId: process.env.STRIPE_PRICE_BASIC || '',
    features: [
      'Up to 100 work orders/month',
      '1 team member',
      'Basic inventory tracking',
      'Email support',
    ],
  },
  pro: {
    name: 'Professional',
    description: 'For growing businesses',
    price: 79,
    priceId: process.env.STRIPE_PRICE_PRO || '',
    features: [
      'Unlimited work orders',
      'Up to 5 team members',
      'Advanced inventory management',
      'Customer SMS reminders',
      'Analytics dashboard',
      'Priority support',
    ],
    popular: true,
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For large operations',
    price: 149,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'Multi-location support',
      'Custom integrations',
      'Dedicated account manager',
      'Phone support',
      'Custom reporting',
    ],
  },
} as const;

export type PricingTier = keyof typeof PRICING_TIERS;

// Helper to get subscription status
export async function getSubscriptionStatus(customerId: string): Promise<{
  status: Stripe.Subscription.Status | 'none';
  tier: PricingTier | null;
  currentPeriodEnd: Date | null;
}> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { status: 'none', tier: null, currentPeriodEnd: null };
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;

    // Determine tier from price ID
    let tier: PricingTier | null = null;
    for (const [key, value] of Object.entries(PRICING_TIERS)) {
      if (value.priceId === priceId) {
        tier = key as PricingTier;
        break;
      }
    }

    // Get current period end (handle different Stripe API versions)
    const periodEnd = 'current_period_end' in subscription
      ? (subscription as unknown as { current_period_end: number }).current_period_end
      : null;

    return {
      status: subscription.status,
      tier,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    };
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return { status: 'none', tier: null, currentPeriodEnd: null };
  }
}

// Create or retrieve Stripe customer
export async function getOrCreateStripeCustomer(
  email: string,
  shopId: string,
  shopName: string
): Promise<string> {
  // Search for existing customer by metadata
  const existingCustomers = await stripe.customers.search({
    query: `metadata['shop_id']:'${shopId}'`,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: shopName,
    metadata: {
      shop_id: shopId,
    },
  });

  return customer.id;
}

// Create checkout session
export async function createCheckoutSession({
  customerId,
  priceId,
  shopId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  shopId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      shop_id: shopId,
    },
    subscription_data: {
      metadata: {
        shop_id: shopId,
      },
    },
    allow_promotion_codes: true,
  });
}

// Create customer portal session
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
