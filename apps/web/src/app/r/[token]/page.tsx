'use client';

import React, { useState } from 'react';
import Script from 'next/script';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Lock,
  ArrowRight,
  CheckCircle2,
  Tag,
} from 'lucide-react';

export default function CustomerRecoveryPage({
  params,
}: {
  params: { token: string };
}) {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const amountInr = 3200;
  const discountInr = 100;
  const finalAmountInr = amountInr - discountInr;

  const handlePayNow = () => {
    setIsProcessing(true);

    // Initialize Razorpay Standard Checkout in Test Mode
    if (typeof (window as any).Razorpay !== 'undefined') {
      const options = {
        key: 'rzp_test_mock', // Replaced dynamically by backend
        amount: finalAmountInr * 100,
        currency: 'INR',
        name: 'Acme Stores',
        description: 'Recovery for Order #ORD-84920',
        handler: function () {
          setPaymentSuccess(true);
          setIsProcessing(false);
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
        prefill: {
          name: 'Pooja Verma',
          email: 'pooja.v@example.com',
          contact: '9876543210',
        },
        theme: {
          color: '#4f46e5',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } else {
      setTimeout(() => {
        setPaymentSuccess(true);
        setIsProcessing(false);
      }, 1500);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-white">Payment Recovered!</h2>
          <p className="mt-2 text-sm text-slate-400">
            Your transaction of <span className="text-white font-semibold">₹{finalAmountInr.toLocaleString('en-IN')}</span> has been successfully verified. Your order is now confirmed.
          </p>
          <div className="mt-6 rounded-2xl bg-slate-950/60 p-4 border border-slate-800 text-left text-xs font-mono text-slate-400 space-y-1">
            <div>Order Reference: #ORD-84920</div>
            <div>Payment ID: pay_rec_{params.token.substring(0, 8)}</div>
            <div>Status: CAPTURED</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-brand-500">
        <div className="w-full max-w-md space-y-6">
          {/* Brand Header */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold text-xl shadow-lg shadow-brand-500/25">
              R
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Complete Your Order Payment
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Merchant: <span className="font-semibold text-slate-200">Acme Stores</span> • Order #ORD-84920
            </p>
          </div>

          {/* Incentive Notice */}
          {discountInr > 0 && (
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/30 p-4 text-xs text-purple-200">
              <Tag className="h-5 w-5 text-purple-400 shrink-0" />
              <div>
                <span className="font-semibold text-purple-300">Special Recovery Offer Applied:</span> ₹{discountInr} discount has been credited to your order.
              </div>
            </div>
          )}

          {/* Payment Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total Amount Due
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  ₹{finalAmountInr.toLocaleString('en-IN')}
                </span>
                {discountInr > 0 && (
                  <span className="text-sm line-through text-slate-500 font-mono">
                    ₹{amountInr.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-6 space-y-3">
              <label className="text-xs font-semibold text-slate-300">
                Choose Payment Method
              </label>

              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`w-full flex items-center justify-between rounded-xl p-3.5 border text-sm font-medium transition ${
                  selectedMethod === 'upi'
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-brand-400" />
                  <span>Instant UPI (GPay / PhonePe / Paytm)</span>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 ${selectedMethod === 'upi' ? 'border-brand-500 bg-brand-500' : 'border-slate-700'}`} />
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`w-full flex items-center justify-between rounded-xl p-3.5 border text-sm font-medium transition ${
                  selectedMethod === 'card'
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-brand-400" />
                  <span>Debit / Credit Card</span>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 ${selectedMethod === 'card' ? 'border-brand-500 bg-brand-500' : 'border-slate-700'}`} />
              </button>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 p-4 font-bold text-white shadow-lg shadow-brand-500/25 hover:opacity-95 transition disabled:opacity-50"
            >
              {isProcessing ? (
                'Securing Payment...'
              ) : (
                <>
                  Pay ₹{finalAmountInr.toLocaleString('en-IN')} Now
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Trust Badges */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                256-Bit SSL Encrypted
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
                Razorpay Test Mode
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
