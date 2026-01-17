'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  PlanTier,
  FeatureKey,
  PlanLimits,
  hasFeature,
  getLimit,
  isWithinLimit,
  getPlan,
  getUpgradeTier,
  FEATURE_INFO,
  PLANS,
} from '@/lib/plans';

export interface FeatureGateResult {
  // Current plan info
  currentTier: PlanTier;
  currentPlan: typeof PLANS[PlanTier];

  // Feature checks
  hasFeature: (feature: FeatureKey) => boolean;
  canUse: (feature: FeatureKey) => boolean; // alias for hasFeature

  // Limit checks
  getLimit: (limitKey: keyof PlanLimits) => number;
  isWithinLimit: (limitKey: keyof PlanLimits, currentCount: number) => boolean;
  getRemainingCount: (limitKey: keyof PlanLimits, currentCount: number) => number | null;

  // Upgrade info
  upgradeTier: PlanTier | null;
  upgradePlan: typeof PLANS[PlanTier] | null;
  needsUpgradeFor: (feature: FeatureKey) => boolean;
  getRequiredTierFor: (feature: FeatureKey) => PlanTier;

  // Loading state
  isLoading: boolean;
}

export function useFeatureGate(): FeatureGateResult {
  const { shop, loading } = useAuth();

  // Map old tier names to new ones (basic -> starter)
  const rawTier = shop?.subscription_tier;
  const currentTier: PlanTier =
    rawTier === 'basic' ? 'starter' :
    rawTier === 'pro' ? 'pro' :
    rawTier === 'enterprise' ? 'enterprise' :
    'starter';

  const currentPlan = getPlan(currentTier);
  const upgradeTier = getUpgradeTier(currentTier);
  const upgradePlan = upgradeTier ? getPlan(upgradeTier) : null;

  return {
    currentTier,
    currentPlan,

    hasFeature: (feature: FeatureKey) => hasFeature(currentTier, feature),
    canUse: (feature: FeatureKey) => hasFeature(currentTier, feature),

    getLimit: (limitKey: keyof PlanLimits) => getLimit(currentTier, limitKey),
    isWithinLimit: (limitKey: keyof PlanLimits, currentCount: number) =>
      isWithinLimit(currentTier, limitKey, currentCount),
    getRemainingCount: (limitKey: keyof PlanLimits, currentCount: number) => {
      const limit = getLimit(currentTier, limitKey);
      if (limit === -1) return null; // unlimited
      return Math.max(0, limit - currentCount);
    },

    upgradeTier,
    upgradePlan,
    needsUpgradeFor: (feature: FeatureKey) => !hasFeature(currentTier, feature),
    getRequiredTierFor: (feature: FeatureKey) => FEATURE_INFO[feature].minTier,

    isLoading: loading,
  };
}

// Simpler hook for quick feature checks
export function useCanUseFeature(feature: FeatureKey): boolean {
  const { hasFeature } = useFeatureGate();
  return hasFeature(feature);
}

// Hook for checking limits
export function useIsWithinLimit(limitKey: keyof PlanLimits, currentCount: number): boolean {
  const { isWithinLimit } = useFeatureGate();
  return isWithinLimit(limitKey, currentCount);
}
