'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, UserPlus, CheckCircle, Loader2, AlertCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Payment verification state - start with checking=true to block form until verified
  const [verifyingPayment, setVerifyingPayment] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Get invite token and email from URL
  const inviteToken = searchParams.get('invite');
  const inviteEmail = searchParams.get('email');

  // Get payment reference from URL (supports both checkout_session and payment_ref)
  const checkoutSession = searchParams.get('checkout_session');
  const paymentRef = searchParams.get('payment_ref');
  const tier = searchParams.get('tier');
  const billing = searchParams.get('billing');
  const urlEmail = searchParams.get('email');

  // Payment reference can be checkout session ID or payment intent ID
  const paymentId = paymentRef || checkoutSession;

  // Check if this is a free tier signup
  const isFreeTier = tier === 'starter' || tier === 'free';

  // Verify payment on mount
  useEffect(() => {
    async function verifyPayment() {
      // If this is an invite flow, skip payment verification
      if (inviteToken) {
        setVerifyingPayment(false);
        setPaymentVerified(true); // Allow invite users to proceed
        return;
      }

      // If this is a free tier signup, skip payment verification
      if (isFreeTier) {
        setVerifyingPayment(false);
        setPaymentVerified(true); // Allow free tier users to proceed
        // Store tier for onboarding
        if (typeof window !== 'undefined') {
          localStorage.setItem('pendingTier', 'starter');
          localStorage.setItem('pendingBillingCycle', 'monthly');
        }
        return;
      }

      // Only check URL payment reference - don't trust localStorage alone
      // This prevents users from manually navigating to /register without payment
      if (!paymentId) {
        // Clear any stale localStorage data (only on client)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pendingCheckoutSession');
          localStorage.removeItem('pendingTier');
          localStorage.removeItem('pendingBillingCycle');
          localStorage.removeItem('pendingEmail');
        }
        setPaymentError('Payment required to create an account');
        setVerifyingPayment(false);
        return;
      }

      try {
        // Determine if this is a PaymentIntent (starts with pi_) or Checkout Session (starts with cs_)
        const isPaymentIntent = paymentId.startsWith('pi_');

        const response = await fetch('/api/stripe/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isPaymentIntent
              ? { paymentIntentId: paymentId }
              : { sessionId: paymentId }
          ),
        });

        const data = await response.json();

        if (data.success) {
          setPaymentVerified(true);
          // Store for onboarding (only on client)
          if (typeof window !== 'undefined') {
            localStorage.setItem('pendingCheckoutSession', paymentId);
            localStorage.setItem('pendingTier', tier || data.tier || 'pro');
            localStorage.setItem('pendingBillingCycle', billing || data.billingCycle || 'monthly');
          }
          // Pre-fill email if available
          if (data.customerEmail && !email) {
            setEmail(data.customerEmail);
          }
        } else {
          // Clear stale/invalid session data (only on client)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pendingCheckoutSession');
            localStorage.removeItem('pendingTier');
            localStorage.removeItem('pendingBillingCycle');
            localStorage.removeItem('pendingEmail');
          }
          setPaymentError(data.error || 'Payment verification failed');
        }
      } catch (err) {
        // Clear stale session data on error (only on client)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pendingCheckoutSession');
          localStorage.removeItem('pendingTier');
          localStorage.removeItem('pendingBillingCycle');
          localStorage.removeItem('pendingEmail');
        }
        setPaymentError('Failed to verify payment');
      } finally {
        setVerifyingPayment(false);
      }
    }

    verifyPayment();
  }, [paymentId, tier, billing, inviteToken, isFreeTier]);

  // Pre-fill email from URL params
  useEffect(() => {
    if (inviteEmail) {
      setEmail(decodeURIComponent(inviteEmail));
    } else if (urlEmail) {
      setEmail(decodeURIComponent(urlEmail));
    }
  }, [inviteEmail, urlEmail]);

  // Password validation
  const validatePassword = (): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Require payment verification for non-invite signups
    if (!inviteToken && !paymentVerified) {
      setError('Please complete payment before creating an account');
      setLoading(false);
      return;
    }

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setSuccess(true);

        setTimeout(() => {
          if (inviteToken) {
            router.push(`/invite/${inviteToken}`);
          } else {
            router.push('/onboarding');
          }
        }, 1500);
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  }

  // Show loading while verifying payment
  if (verifyingPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  // Show payment required message if no valid payment
  if (!inviteToken && paymentError && !paymentVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Required</h1>
          <p className="text-slate-400 mb-6">
            Please complete payment to create your TireOps account.
          </p>
          <div className="space-y-3">
            <Link href="/#pricing">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                View Pricing Plans
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="w-full text-slate-400">
                Return Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-block p-4 bg-blue-600 rounded-2xl mb-4"
          >
            <UserPlus className="text-white" size={40} />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            TireOps
          </h1>
          <p className="text-slate-400">
            {inviteToken ? 'Create your account to join the team' : 'Create your account'}
          </p>
          {paymentVerified && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm">
              <CheckCircle size={16} />
              Payment verified
            </div>
          )}
        </div>

        {/* Signup Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700"
        >
          <form onSubmit={handleSignup} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-slate-500" size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-600 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-slate-500" size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Strong password required"
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-600 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="text-slate-500 hover:text-slate-300" size={20} />
                  ) : (
                    <Eye className="text-slate-500 hover:text-slate-300" size={20} />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Min 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-slate-500" size={20} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-600 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="text-slate-500 hover:text-slate-300" size={20} />
                  ) : (
                    <Eye className="text-slate-500 hover:text-slate-300" size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-900/20 border border-red-800 rounded-lg"
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-900/20 border border-green-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <p className="text-sm text-green-400">
                    Account created successfully! Redirecting...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : success ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle size={20} />
                  <span>Account created!</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Link to Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Secure registration powered by Supabase Auth
        </p>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
