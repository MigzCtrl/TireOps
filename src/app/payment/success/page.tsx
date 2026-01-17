'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle, Loader2, ArrowRight, Mail, Shield, AlertCircle,
  Lock, CreditCard, Receipt, Clock, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLAN_DETAILS: Record<string, { name: string; monthlyPrice: number; yearlyPrice: number }> = {
  basic: { name: 'Basic', monthlyPrice: 29, yearlyPrice: 290 },
  pro: { name: 'Professional', monthlyPrice: 59, yearlyPrice: 590 },
  enterprise: { name: 'Enterprise', monthlyPrice: 149, yearlyPrice: 1490 },
};

function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  // Support both Checkout Session and PaymentIntent
  const sessionId = searchParams.get('session_id');
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const tier = searchParams.get('tier') || 'pro';
  const billing = searchParams.get('billing') || 'monthly';

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState('');

  const plan = PLAN_DETAILS[tier] || PLAN_DETAILS.pro;
  const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const isYearly = billing === 'yearly';
  const orderNumber = (paymentIntentId || sessionId || '').slice(-8).toUpperCase() || 'N/A';
  const orderDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    async function verifyPayment() {
      // Check redirect status for PaymentIntent flow
      if (paymentIntentId && redirectStatus === 'failed') {
        setError('Payment failed. Please try again.');
        setVerifying(false);
        return;
      }

      if (!sessionId && !paymentIntentId) {
        setError('No payment information found');
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch('/api/stripe/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId || undefined,
            paymentIntentId: paymentIntentId || undefined,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setVerified(true);
          setCustomerEmail(data.customerEmail || '');
          setSubscriptionId(data.subscriptionId || data.paymentIntentId || '');

          // Store in localStorage for registration
          const paymentRef = paymentIntentId || sessionId;
          if (paymentRef) {
            localStorage.setItem('pendingCheckoutSession', paymentRef);
            localStorage.setItem('pendingTier', data.tier || tier);
            localStorage.setItem('pendingBillingCycle', data.billingCycle || billing);
          }
          if (data.customerEmail) {
            localStorage.setItem('pendingEmail', data.customerEmail);
          }

          // Send welcome email for both checkout sessions and payment intents
          const emailKey = paymentIntentId || sessionId;
          if (emailKey && data.customerEmail) {
            const emailSentKey = `emailSent_${emailKey}`;
            if (!localStorage.getItem(emailSentKey)) {
              try {
                const emailResponse = await fetch('/api/stripe/send-welcome-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: sessionId || undefined,
                    paymentIntentId: paymentIntentId || undefined,
                    email: data.customerEmail,
                  }),
                });
                const emailData = await emailResponse.json();
                if (emailData.success) {
                  setEmailSent(true);
                  localStorage.setItem(emailSentKey, 'true');
                } else {
                  console.error('Welcome email failed:', emailData.error);
                }
              } catch (emailErr) {
                console.error('Failed to send welcome email:', emailErr);
              }
            } else {
              setEmailSent(true);
            }
          }
        } else {
          setError(data.error || 'Payment verification failed');
        }
      } catch (err) {
        setError('Failed to verify payment. Please contact support.');
      } finally {
        setVerifying(false);
      }
    }

    verifyPayment();
  }, [sessionId, paymentIntentId, redirectStatus, tier, billing]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Securing your payment...</p>
          <p className="text-slate-500 text-sm mt-2">This usually takes just a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="space-y-3">
            <Link href="/checkout/pro">
              <Button className="w-full">Try Again</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">Return Home</Button>
            </Link>
            <p className="text-sm text-slate-500">
              Need help? Contact support@tireops.xyz
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const paymentRef = paymentIntentId || sessionId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CheckCircle className="w-10 h-10 text-green-400" />
            </motion.div>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment Confirmed</h1>
          <p className="text-slate-400">Your subscription is now active</p>
        </motion.div>

        {/* Receipt Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden mb-6"
        >
          {/* Receipt Header */}
          <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-white">Order Receipt</span>
              </div>
              <span className="text-sm text-slate-400">#{orderNumber}</span>
            </div>
          </div>

          {/* Receipt Body */}
          <div className="p-6 space-y-4">
            {/* Plan Details */}
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div>
                <p className="font-medium text-white">TireOps {plan.name} Plan</p>
                <p className="text-sm text-slate-400">
                  {isYearly ? 'Annual' : 'Monthly'} subscription
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">
                  ${price}/{isYearly ? 'yr' : 'mo'}
                </p>
                {isYearly && (
                  <p className="text-xs text-green-400">
                    ${Math.round(price / 12)}/mo
                  </p>
                )}
              </div>
            </div>

            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 py-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Order Date</p>
                <p className="text-sm text-slate-300">{orderDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Billing Email</p>
                <p className="text-sm text-slate-300 truncate">{customerEmail || 'Provided at checkout'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Payment Method</p>
                <p className="text-sm text-slate-300 flex items-center gap-1">
                  <CreditCard size={14} /> Card ending in ****
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Next Billing</p>
                <p className="text-sm text-slate-300 flex items-center gap-1">
                  <Clock size={14} /> {new Date(Date.now() + (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Email Confirmation */}
            {emailSent && (
              <div className="flex items-center gap-3 p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Confirmation email sent</p>
                  <p className="text-xs text-slate-400">Check {customerEmail} for your receipt and setup link</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Next Steps Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-400" />
            Complete Your Setup
          </h2>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div>
                <p className="font-medium text-white">Payment confirmed</p>
                <p className="text-sm text-slate-400">Your subscription is active and ready</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <div>
                <p className="font-medium text-white">Create your account</p>
                <p className="text-sm text-slate-400">Set up your login credentials</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-400">3</span>
              </div>
              <div>
                <p className="font-medium text-slate-400">Set up your shop</p>
                <p className="text-sm text-slate-500">Add your business details and start managing</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Link href={`/register?payment_ref=${paymentRef}&tier=${tier}&billing=${billing}${customerEmail ? `&email=${encodeURIComponent(customerEmail)}` : ''}`}>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-semibold">
              Create Your Account
              <ArrowRight className="ml-2" size={20} />
            </Button>
          </Link>

          <p className="text-center text-xs text-slate-500 mt-4">
            Your payment is linked to this session. Complete registration to activate your account.
          </p>
        </motion.div>

        {/* Trust Signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm"
        >
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-green-500" />
            <span>SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-green-500" />
            <span>Secure Checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-green-500" />
            <span>Powered by Stripe</span>
          </div>
        </motion.div>

        {/* Help text */}
        <p className="text-center text-slate-500 text-sm mt-8">
          Questions? Contact <a href="mailto:support@tireops.xyz" className="text-blue-400 hover:underline">support@tireops.xyz</a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
