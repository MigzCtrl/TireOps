'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Shield, Lock, Sparkles, ArrowLeft, CreditCard } from 'lucide-react';
import { loadStripe, Appearance } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PLANS = {
  pro: {
    name: 'Professional',
    monthlyPrice: 29,
    yearlyPrice: 290,
    description: 'For growing tire shops',
    features: ['2,000 customers', '5 team members', 'AI-powered import', 'SMS notifications'],
    popular: true,
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 79,
    yearlyPrice: 790,
    description: 'For multi-location businesses',
    features: ['Unlimited everything', 'Multi-shop', 'QuickBooks', 'AI Assistant'],
    popular: false,
  },
};

type PlanKey = keyof typeof PLANS;

// Dark theme appearance for Stripe Elements
const appearance: Appearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#3b82f6',
    colorBackground: '#1e293b',
    colorText: '#f1f5f9',
    colorTextSecondary: '#94a3b8',
    colorTextPlaceholder: '#64748b',
    colorDanger: '#ef4444',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      boxShadow: 'none',
      padding: '12px 14px',
    },
    '.Input:focus': {
      border: '1px solid #3b82f6',
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
    },
    '.Input:hover': {
      border: '1px solid #475569',
    },
    '.Label': {
      color: '#e2e8f0',
      fontWeight: '500',
      marginBottom: '8px',
    },
    '.Tab': {
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      color: '#94a3b8',
    },
    '.Tab:hover': {
      backgroundColor: '#334155',
      color: '#f1f5f9',
    },
    '.Tab--selected': {
      backgroundColor: '#3b82f6',
      border: '1px solid #3b82f6',
      color: '#ffffff',
    },
    '.TabIcon': {
      fill: '#94a3b8',
    },
    '.TabIcon--selected': {
      fill: '#ffffff',
    },
    '.Block': {
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
    },
    '.CheckboxInput': {
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
    },
    '.CheckboxInput--checked': {
      backgroundColor: '#3b82f6',
      border: '1px solid #3b82f6',
    },
  },
};

// Payment form component
function PaymentForm({
  selectedPlan,
  billingCycle,
  price,
  tier,
  email,
  onBack,
}: {
  selectedPlan: typeof PLANS.basic;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  tier: PlanKey;
  email: string;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthlyEquivalent = billingCycle === 'yearly'
    ? Math.round(selectedPlan.yearlyPrice / 12)
    : selectedPlan.monthlyPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?tier=${tier}&billing=${billingCycle}`,
        },
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      key="payment-form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-full max-w-xl"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        <span className="text-sm">Change plan</span>
      </button>

      {/* Plan Summary Card */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">TireOps {selectedPlan.name}</h2>
            <p className="text-slate-400 text-sm mt-1">{selectedPlan.description}</p>
            <p className="text-slate-500 text-xs mt-2">{email}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">${price}</div>
            <div className="text-slate-400 text-sm">
              /{billingCycle === 'yearly' ? 'year' : 'month'}
            </div>
            {billingCycle === 'yearly' && (
              <div className="text-green-400 text-xs mt-1 font-medium">
                ${monthlyEquivalent}/mo
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stripe Payment Element */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-blue-400" />
            Payment method
          </h3>
          <PaymentElement
            options={{
              layout: {
                type: 'tabs',
                defaultCollapsed: false,
              },
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={!stripe || isProcessing}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-base
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            `Subscribe — $${price}/${billingCycle === 'yearly' ? 'yr' : 'mo'}`
          )}
        </motion.button>

        {/* Trust Signals */}
        <div className="flex items-center justify-center gap-6 text-slate-500 text-sm">
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-green-500" />
            <span>30-day guarantee</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock size={14} className="text-green-500" />
            <span>256-bit SSL</span>
          </div>
        </div>

        {/* Terms */}
        <p className="text-xs text-slate-500 text-center">
          By subscribing, you agree to our{' '}
          <Link href="/terms" className="text-blue-400 hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
          You can cancel anytime.
        </p>
      </form>
    </motion.div>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const initialTier = params.tier as string;
  const [selectedTier, setSelectedTier] = useState<PlanKey>(
    PLANS[initialTier as PlanKey] ? (initialTier as PlanKey) : 'pro'
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const selectedPlan = PLANS[selectedTier];
  const price = billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;

  const [initError, setInitError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleContinue = async () => {
    // Validate email
    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setInitError(null);
    setEmailError(null);
    try {
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, billingCycle, email }),
      });
      const data = await response.json();

      if (data.error) {
        console.error('Error:', data.error);
        setInitError(data.error);
        return;
      }

      setClientSecret(data.clientSecret);
      setShowPayment(true);
    } catch (error) {
      console.error('Failed to initialize checkout:', error);
      setInitError('Failed to connect to payment service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setShowPayment(false);
    setClientSecret(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TO</span>
            </div>
            <span className="text-lg font-semibold text-white">TireOps</span>
          </Link>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Lock size={14} />
            <span>Secure checkout</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <AnimatePresence mode="wait">
          {!showPayment ? (
            <motion.div
              key="plan-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-4xl"
            >
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-semibold text-white tracking-tight">
                  Select a plan
                </h1>
              </motion.div>

              {/* Billing Toggle */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex justify-center mb-8"
              >
                <div className="inline-flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      billingCycle === 'monthly'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      billingCycle === 'yearly'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Yearly
                    <span className="text-xs px-2 py-0.5 bg-green-600/20 text-green-400 rounded-full font-medium">
                      Save 17%
                    </span>
                  </button>
                </div>
              </motion.div>

              {/* Plan Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, plan], index) => {
                  const isSelected = selectedTier === key;
                  const planPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                  const planMonthly = billingCycle === 'yearly'
                    ? Math.round(plan.yearlyPrice / 12)
                    : plan.monthlyPrice;

                  return (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedTier(key)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-slate-800 shadow-lg shadow-blue-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      {/* Popular Badge */}
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full font-medium flex items-center gap-1 shadow-lg">
                            <Sparkles size={10} />
                            Most Popular
                          </span>
                        </div>
                      )}

                      {/* Selection Indicator */}
                      <motion.div
                        initial={false}
                        animate={{ scale: isSelected ? 1 : 0.8, opacity: isSelected ? 1 : 0.5 }}
                        className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </motion.div>

                      {/* Plan Name */}
                      <div className="mb-4 pr-8">
                        <h3 className="font-semibold text-white text-lg">{plan.name}</h3>
                        <p className="text-sm text-slate-400 mt-0.5">{plan.description}</p>
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-white">${planPrice}</span>
                          <span className="text-slate-400 text-sm">
                            /{billingCycle === 'yearly' ? 'year' : 'month'}
                          </span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <p className="text-xs text-green-400 mt-1 font-medium">
                            Just ${planMonthly}/mo — billed annually
                          </p>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-2.5 border-t border-slate-700/50 pt-4">
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-blue-500/20' : 'bg-slate-700'
                            }`}>
                              <Check size={10} className={isSelected ? 'text-blue-400' : 'text-slate-400'} />
                            </div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Email & Checkout Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="max-w-md mx-auto"
              >
                {/* Email Input */}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all
                      ${emailError ? 'border-red-500' : 'border-slate-700 hover:border-slate-600'}`}
                  />
                  {emailError && (
                    <p className="mt-2 text-sm text-red-400">{emailError}</p>
                  )}
                </div>

                <motion.button
                  onClick={handleContinue}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-base
                    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Continue to checkout'
                  )}
                </motion.button>

                {/* Error Message */}
                {initError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm text-center"
                  >
                    {initError}
                  </motion.div>
                )}

                {/* Trust Signals */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-6 mt-6 text-slate-500 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <Shield size={14} className="text-green-500" />
                    <span>30-day guarantee</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock size={14} className="text-green-500" />
                    <span>SSL secured</span>
                  </div>
                </motion.div>

                {/* Fine Print */}
                <p className="text-xs text-slate-500 text-center mt-4">
                  By continuing, you agree to our{' '}
                  <Link href="/terms" className="text-blue-400 hover:underline">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-400 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </motion.div>
            </motion.div>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance,
              }}
            >
              <PaymentForm
                selectedPlan={selectedPlan}
                billingCycle={billingCycle}
                price={price}
                tier={selectedTier}
                email={email}
                onBack={handleBack}
              />
            </Elements>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
