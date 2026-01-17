// TireOps Subscription Plans & Feature Gating
// Used by useFeatureGate hook and UpgradePrompt component

export type PlanTier = 'starter' | 'pro' | 'enterprise';

export type FeatureKey =
  | 'ai_import'
  | 'online_booking'
  | 'sms_notifications'
  | 'advanced_analytics'
  | 'multi_shop'
  | 'quickbooks'
  | 'wholesale_api'
  | 'ai_assistant'
  | 'priority_support';

export interface PlanLimits {
  customers: number;
  inventory: number;
  workOrdersPerMonth: number;
  users: number;
}

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  price: {
    monthly: number;
    yearly: number;
  };
  limits: PlanLimits;
  features: FeatureKey[];
  description: string;
  badge?: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  starter: {
    name: 'Starter',
    tier: 'starter',
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      customers: 50,
      inventory: 100,
      workOrdersPerMonth: 25,
      users: 1,
    },
    features: [],
    description: 'Perfect for getting started',
  },
  pro: {
    name: 'Professional',
    tier: 'pro',
    price: {
      monthly: 29,
      yearly: 290,
    },
    limits: {
      customers: 2000,
      inventory: 1000,
      workOrdersPerMonth: -1, // -1 = unlimited
      users: 5,
    },
    features: [
      'ai_import',
      'online_booking',
      'sms_notifications',
      'advanced_analytics',
    ],
    description: 'For growing tire shops',
    badge: 'Popular',
  },
  enterprise: {
    name: 'Enterprise',
    tier: 'enterprise',
    price: {
      monthly: 79,
      yearly: 790,
    },
    limits: {
      customers: -1, // unlimited
      inventory: -1,
      workOrdersPerMonth: -1,
      users: -1,
    },
    features: [
      'ai_import',
      'online_booking',
      'sms_notifications',
      'advanced_analytics',
      'multi_shop',
      'quickbooks',
      'wholesale_api',
      'ai_assistant',
      'priority_support',
    ],
    description: 'For multi-location businesses',
  },
};

// Feature metadata for UI display
export const FEATURE_INFO: Record<FeatureKey, {
  name: string;
  description: string;
  minTier: PlanTier;
}> = {
  ai_import: {
    name: 'AI-Powered Import',
    description: 'Import customers & inventory from photos, PDFs, spreadsheets using AI',
    minTier: 'pro',
  },
  online_booking: {
    name: 'Online Booking',
    description: 'Let customers book appointments online 24/7',
    minTier: 'pro',
  },
  sms_notifications: {
    name: 'SMS Notifications',
    description: 'Send appointment reminders and updates via text',
    minTier: 'pro',
  },
  advanced_analytics: {
    name: 'Advanced Analytics',
    description: 'Detailed reports on revenue, customers, and inventory',
    minTier: 'pro',
  },
  multi_shop: {
    name: 'Multi-Shop Management',
    description: 'Manage multiple locations from one dashboard',
    minTier: 'enterprise',
  },
  quickbooks: {
    name: 'QuickBooks Integration',
    description: 'Sync invoices and payments with QuickBooks',
    minTier: 'enterprise',
  },
  wholesale_api: {
    name: 'Wholesale API',
    description: 'Connect to tire distributors for real-time pricing & ordering',
    minTier: 'enterprise',
  },
  ai_assistant: {
    name: 'AI Assistant (TireBot)',
    description: 'Voice/chat assistant to create work orders, manage inventory, and more',
    minTier: 'enterprise',
  },
  priority_support: {
    name: 'Priority Support',
    description: 'Direct access to support team with faster response times',
    minTier: 'enterprise',
  },
};

// Helper functions
export function getPlan(tier: PlanTier | string | null | undefined): PlanConfig {
  if (!tier || !(tier in PLANS)) {
    return PLANS.starter;
  }
  return PLANS[tier as PlanTier];
}

export function hasFeature(tier: PlanTier | string | null | undefined, feature: FeatureKey): boolean {
  const plan = getPlan(tier);
  return plan.features.includes(feature);
}

export function getLimit(tier: PlanTier | string | null | undefined, limitKey: keyof PlanLimits): number {
  const plan = getPlan(tier);
  return plan.limits[limitKey];
}

export function isWithinLimit(
  tier: PlanTier | string | null | undefined,
  limitKey: keyof PlanLimits,
  currentCount: number
): boolean {
  const limit = getLimit(tier, limitKey);
  if (limit === -1) return true; // unlimited
  return currentCount < limit;
}

export function getUpgradeTier(currentTier: PlanTier | string | null | undefined): PlanTier | null {
  const tier = currentTier || 'starter';
  if (tier === 'starter') return 'pro';
  if (tier === 'pro') return 'enterprise';
  return null; // already at max
}

export function formatLimit(limit: number): string {
  if (limit === -1) return 'Unlimited';
  return limit.toLocaleString();
}
