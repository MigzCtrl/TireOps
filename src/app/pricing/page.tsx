'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface PricingTierInfo {
  name: string;
  description: string;
  price: number;
  yearlyPrice?: number;
  features: string[];
  popular?: boolean;
  isFree?: boolean;
}

const PRICING_TIERS: Record<string, PricingTierInfo> = {
  starter: {
    name: 'Starter',
    description: 'Perfect for getting started',
    price: 0,
    isFree: true,
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
    price: 29,
    yearlyPrice: 290,
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
    price: 79,
    yearlyPrice: 790,
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
};

type PricingTier = 'starter' | 'pro' | 'enterprise';

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, shop } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelled = searchParams.get('subscription') === 'cancelled';

  const handleSubscribe = async (tier: string) => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setLoading(tier);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg border-b border-border-muted">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={user ? '/settings' : '/'}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-text">Pricing</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-text-muted max-w-2xl mx-auto">
            Choose the plan that fits your shop. All plans include a 14-day free trial.
            No credit card required to start.
          </p>
        </div>

        {/* Alerts */}
        {cancelled && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Checkout was cancelled. You can try again whenever you&apos;re ready.
            </p>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(PRICING_TIERS).map(
            ([key, tier]) => (
              <div
                key={key}
                className={`relative bg-bg rounded-2xl border p-8 flex flex-col ${
                  tier.popular
                    ? 'border-primary shadow-lg shadow-primary/10 scale-105'
                    : 'border-border-muted'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <Sparkles size={14} />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-text mb-2">{tier.name}</h3>
                  <p className="text-text-muted text-sm">{tier.description}</p>
                </div>

                <div className="mb-6">
                  {tier.isFree ? (
                    <span className="text-4xl font-bold text-text">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-text">${tier.price}</span>
                      <span className="text-text-muted">/month</span>
                    </>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-text-muted text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => tier.isFree ? router.push('/register?tier=starter') : handleSubscribe(key)}
                  disabled={loading !== null && !tier.isFree}
                  className={`w-full ${
                    tier.popular
                      ? 'bg-primary hover:bg-primary/90'
                      : 'bg-bg-light hover:bg-bg-light/80 text-text'
                  }`}
                >
                  {loading === key ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : tier.isFree ? (
                    'Get Started Free'
                  ) : (
                    'Start Free Trial'
                  )}
                </Button>
              </div>
            )
          )}
        </div>

        {/* FAQ / Trust signals */}
        <div className="mt-16 text-center">
          <p className="text-text-muted text-sm mb-4">
            All plans include SSL security, automatic backups, and 99.9% uptime SLA.
          </p>
          <p className="text-text-muted text-sm">
            Have questions?{' '}
            <a href="mailto:support@tireops.com" className="text-primary hover:underline">
              Contact our sales team
            </a>
          </p>
        </div>

        {/* Current subscription info */}
        {(shop as { subscription_status?: string; subscription_tier?: string } | null)?.subscription_status === 'active' && (
          <div className="mt-12 max-w-md mx-auto p-6 bg-bg rounded-xl border border-border-muted text-center">
            <p className="text-text mb-4">
              You&apos;re currently on the{' '}
              <span className="font-semibold capitalize">
                {(shop as { subscription_tier?: string } | null)?.subscription_tier}
              </span> plan
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch('/api/stripe/portal', { method: 'POST' });
                  const data = await response.json();
                  if (data.url) {
                    window.location.href = data.url;
                  }
                } catch (err) {
                  console.error('Portal error:', err);
                }
              }}
            >
              Manage Subscription
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
