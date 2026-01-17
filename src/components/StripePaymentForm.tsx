'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StripePaymentFormProps {
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  planName: string;
  onSuccess?: () => void;
}

export default function StripePaymentForm({
  amount,
  billingCycle,
  planName,
  onSuccess,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setIsProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
      },
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setIsProcessing(false);
    } else {
      setIsComplete(true);
      onSuccess?.();
    }
  };

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-white" size={32} />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Payment Successful!</h3>
        <p className="text-slate-400">Redirecting you to complete setup...</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">
            Payment Details
          </label>
          <div className="flex items-center gap-1.5 text-green-400 text-xs">
            <Lock size={12} />
            <span>Secure</span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <PaymentElement
            options={{
              layout: {
                type: 'tabs',
                defaultCollapsed: false,
              },
              business: {
                name: 'TireOps',
              },
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800/50 rounded-lg"
        >
          <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Order Summary */}
      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400">TireOps {planName}</span>
          <span className="text-white font-medium">
            ${amount}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
          </span>
        </div>
        <div className="border-t border-slate-700 mt-3 pt-3 flex justify-between items-center">
          <span className="text-white font-semibold">Total due today</span>
          <span className="text-xl font-bold text-white">${amount}</span>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-6 text-lg font-semibold rounded-xl shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={20} />
            <span>Processing payment...</span>
          </div>
        ) : (
          <span>Pay ${amount}</span>
        )}
      </Button>

      {/* Security Note */}
      <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1.5">
        <Lock size={12} />
        Your payment info is encrypted and secure
      </p>
    </form>
  );
}
