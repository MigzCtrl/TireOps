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
    update: (id: string, params: Stripe.SubscriptionUpdateParams) => getStripe().subscriptions.update(id, params),
    create: (params: Stripe.SubscriptionCreateParams) => getStripe().subscriptions.create(params),
  },
  customers: {
    list: (params?: Stripe.CustomerListParams) => getStripe().customers.list(params),
    search: (params: Stripe.CustomerSearchParams) => getStripe().customers.search(params),
    create: (params: Stripe.CustomerCreateParams) => getStripe().customers.create(params),
  },
  paymentIntents: {
    list: (params?: Stripe.PaymentIntentListParams) => getStripe().paymentIntents.list(params),
    retrieve: (id: string) => getStripe().paymentIntents.retrieve(id),
    create: (params: Stripe.PaymentIntentCreateParams) => getStripe().paymentIntents.create(params),
  },
  setupIntents: {
    retrieve: (id: string) => getStripe().setupIntents.retrieve(id),
    create: (params: Stripe.SetupIntentCreateParams) => getStripe().setupIntents.create(params),
  },
  checkout: {
    sessions: {
      create: (params: Stripe.Checkout.SessionCreateParams) => getStripe().checkout.sessions.create(params),
      retrieve: (id: string, params?: Stripe.Checkout.SessionRetrieveParams) => getStripe().checkout.sessions.retrieve(id, params),
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
  products: {
    list: (params?: Stripe.ProductListParams) => getStripe().products.list(params),
    create: (params: Stripe.ProductCreateParams) => getStripe().products.create(params),
  },
  prices: {
    create: (params: Stripe.PriceCreateParams) => getStripe().prices.create(params),
  },
};

// Pricing tiers with monthly and yearly options
export const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPriceId: '', // Free tier - no Stripe price
    yearlyPriceId: '',
    get price() { return this.monthlyPrice; },
    get priceId() { return this.monthlyPriceId; },
    features: [
      '50 customers',
      '100 inventory items',
      '25 work orders/month',
      '1 team member',
      'Manual data entry',
    ],
  },
  pro: {
    name: 'Professional',
    description: 'For growing tire shops',
    monthlyPrice: 29,
    yearlyPrice: 290, // 2 months free
    monthlyPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_PRO || '',
    yearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    get price() { return this.monthlyPrice; },
    get priceId() { return this.monthlyPriceId; },
    features: [
      '2,000 customers',
      '1,000 inventory items',
      'Unlimited work orders',
      '5 team members',
      'AI-powered import',
      'Online booking',
      'SMS notifications',
      'Advanced analytics',
    ],
    popular: true,
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For multi-location businesses',
    monthlyPrice: 79,
    yearlyPrice: 790, // 2 months free
    monthlyPriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || process.env.STRIPE_PRICE_ENTERPRISE || '',
    yearlyPriceId: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
    get price() { return this.monthlyPrice; },
    get priceId() { return this.monthlyPriceId; },
    features: [
      'Unlimited customers',
      'Unlimited inventory',
      'Unlimited work orders',
      'Unlimited team members',
      'Everything in Professional',
      'Multi-shop management',
      'QuickBooks integration',
      'Wholesale API access',
      'AI Assistant (TireBot)',
      'Priority support',
    ],
  },
} as const;

export type BillingCycle = 'monthly' | 'yearly';

// Helper to get the correct price ID based on billing cycle
export function getPriceId(tier: PricingTier, billingCycle: BillingCycle): string {
  const tierConfig = PRICING_TIERS[tier];
  return billingCycle === 'yearly' ? tierConfig.yearlyPriceId : tierConfig.monthlyPriceId;
}

// Helper to get the price amount based on billing cycle
export function getPrice(tier: PricingTier, billingCycle: BillingCycle): number {
  const tierConfig = PRICING_TIERS[tier];
  return billingCycle === 'yearly' ? tierConfig.yearlyPrice : tierConfig.monthlyPrice;
}

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
