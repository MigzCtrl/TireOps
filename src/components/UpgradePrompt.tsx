'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { FeatureKey, FEATURE_INFO, PLANS, PlanTier, PlanLimits } from '@/lib/plans';
import {
  Sparkles,
  Lock,
  ArrowRight,
  Check,
  Crown,
  Zap,
  Users,
  Package,
  FileText,
  Bot,
  Calendar,
  MessageSquare,
  BarChart3,
  Building2,
  Receipt,
  Truck,
  HeadphonesIcon,
} from 'lucide-react';

// Icon mapping for features
const FEATURE_ICONS: Record<FeatureKey, React.ReactNode> = {
  ai_import: <Sparkles size={20} />,
  online_booking: <Calendar size={20} />,
  sms_notifications: <MessageSquare size={20} />,
  advanced_analytics: <BarChart3 size={20} />,
  multi_shop: <Building2 size={20} />,
  quickbooks: <Receipt size={20} />,
  wholesale_api: <Truck size={20} />,
  ai_assistant: <Bot size={20} />,
  priority_support: <HeadphonesIcon size={20} />,
};

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: FeatureKey;
  limitType?: keyof PlanLimits;
  currentCount?: number;
  title?: string;
  description?: string;
}

export function UpgradePrompt({
  open,
  onOpenChange,
  feature,
  limitType,
  currentCount,
  title,
  description,
}: UpgradePromptProps) {
  const router = useRouter();
  const { currentTier, currentPlan, upgradeTier, upgradePlan } = useFeatureGate();

  // Determine what we're prompting for
  const featureInfo = feature ? FEATURE_INFO[feature] : null;
  const requiredTier = feature ? featureInfo?.minTier : upgradeTier;
  const targetPlan = requiredTier ? PLANS[requiredTier] : upgradePlan;

  // Build title and description
  const displayTitle = title || (
    feature
      ? `Unlock ${featureInfo?.name}`
      : limitType
      ? `You've reached your ${limitType} limit`
      : 'Upgrade to unlock more'
  );

  const displayDescription = description || (
    feature
      ? featureInfo?.description
      : limitType
      ? `Your ${currentPlan.name} plan allows ${currentPlan.limits[limitType]} ${limitType}. Upgrade to get more.`
      : 'Get access to more features and higher limits.'
  );

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push('/pricing');
  };

  if (!targetPlan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10">
            {feature ? (
              <div className="text-primary">{FEATURE_ICONS[feature]}</div>
            ) : (
              <Lock className="text-primary" size={24} />
            )}
          </div>
          <DialogTitle className="text-center text-text">{displayTitle}</DialogTitle>
          <DialogDescription className="text-center">
            {displayDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 rounded-xl bg-bg-light border border-border-muted">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="text-primary" size={18} />
              <span className="font-semibold text-text">{targetPlan.name}</span>
              {targetPlan.badge && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {targetPlan.badge}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-text">${targetPlan.price.monthly}</span>
              <span className="text-sm text-text-muted">/mo</span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Show relevant features for this plan */}
            {targetPlan.features.slice(0, 4).map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm">
                <Check className="text-success flex-shrink-0" size={16} />
                <span className="text-text-muted">{FEATURE_INFO[feat].name}</span>
              </div>
            ))}
            {targetPlan.features.length > 4 && (
              <div className="text-sm text-text-muted pl-6">
                +{targetPlan.features.length - 4} more features
              </div>
            )}
          </div>
        </div>

        {/* Limit comparison if applicable */}
        {limitType && (
          <div className="mt-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Current ({currentPlan.name})</span>
              <span className="text-text font-medium">
                {currentCount ?? 0} / {currentPlan.limits[limitType]}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-text-muted">With {targetPlan.name}</span>
              <span className="text-success font-medium">
                {targetPlan.limits[limitType] === -1 ? 'Unlimited' : targetPlan.limits[limitType].toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleUpgrade}
          >
            <Zap size={16} />
            Upgrade Now
          </Button>
        </div>

        <p className="text-xs text-text-muted text-center mt-2">
          Cancel anytime. 14-day money-back guarantee.
        </p>
      </DialogContent>
    </Dialog>
  );
}

// Convenience component for wrapping features that need gating
interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { hasFeature } = useFeatureGate();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // If fallback provided, render it; otherwise render children wrapped with click handler
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div onClick={() => setShowUpgrade(true)} className="cursor-pointer">
        {children}
      </div>
      <UpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature={feature}
      />
    </>
  );
}

// Hook for programmatic upgrade prompts
export function useUpgradePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<Partial<UpgradePromptProps>>({});

  const showUpgradePrompt = (config: Partial<UpgradePromptProps> = {}) => {
    setPromptConfig(config);
    setIsOpen(true);
  };

  const UpgradePromptElement = (
    <UpgradePrompt
      open={isOpen}
      onOpenChange={setIsOpen}
      {...promptConfig}
    />
  );

  return { showUpgradePrompt, UpgradePromptElement };
}
