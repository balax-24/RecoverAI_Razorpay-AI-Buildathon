import React from 'react';
import {
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCode,
  DollarSign,
  RotateCcw,
} from 'lucide-react';

interface PoliciesViewProps {
  policies?: any[];
}

export function PoliciesView({ policies }: PoliciesViewProps) {
  const policy = policies?.[0] || {
    id: 'pol_default_01',
    code: 'DEFAULT_POLICY',
    name: 'Standard E-Commerce Recovery Policy',
    version: 1,
    maxRetryAttempts: 3,
    maxDiscountInr: 100,
    highValueThreshold: 10000,
    minIntervalHours: 6,
    requiresHumanReview: false,
    isActive: true,
    rulesDSL: {
      max_retries: 3,
      max_discount_inr: 100,
      cooldown_hours: 6,
      high_value_threshold_inr: 10000,
      allowed_actions: [
        'SMART_RETRY',
        'PAYMENT_LINK',
        'CUSTOMER_MESSAGING',
        'INCENTIVE_OFFER',
      ],
      restricted_reasons_for_retry: ['CARD_STOLEN', 'ACCOUNT_BLOCKED', 'FRAUD_SUSPECTED'],
    },
  };

  const dsl = policy.rulesDSL || {};

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Deterministic Policy Engine & Rules DSL
              </h2>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                ACTIVE (v{policy.version})
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Hard deterministic constraints governing all AI autonomous decisions before financial action execution.
            </p>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Maximum Retry Limit */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Maximum Retry Attempts
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">
            {dsl.max_retries || policy.maxRetryAttempts || 3}
          </div>
          <p className="text-xs text-slate-400">
            Smart retries are capped at {dsl.max_retries || 3} attempts to avoid card issuer penalties and velocity blocks.
          </p>
        </div>

        {/* Max Incentive Discount */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Maximum Incentive Offer
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">
            ₹{dsl.max_discount_inr || policy.maxDiscountInr || 100}
          </div>
          <p className="text-xs text-slate-400">
            Autonomous AI discount incentives cannot exceed ₹{dsl.max_discount_inr || 100} under policy constraints.
          </p>
        </div>

        {/* High-Value Gate */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              High-Value Threshold
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">
            ₹{Number(dsl.high_value_threshold_inr || policy.highValueThreshold || 10000).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-400">
            Transactions &ge; ₹{Number(dsl.high_value_threshold_inr || 10000).toLocaleString('en-IN')} automatically require Maker-Checker dual authorization.
          </p>
        </div>
      </div>

      {/* Additional Policy Guardrails */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Allowed Recovery Actions Whitelist
          </h3>
          <div className="flex flex-wrap gap-2">
            {(dsl.allowed_actions || [
              'SMART_RETRY',
              'PAYMENT_LINK',
              'CUSTOMER_MESSAGING',
              'INCENTIVE_OFFER',
            ]).map((action: string) => (
              <span
                key={action}
                className="rounded-lg bg-slate-800 px-3 py-1 font-mono text-xs font-semibold text-indigo-300 border border-slate-700"
              >
                {action}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            Restricted Failure Reasons for Retry
          </h3>
          <div className="flex flex-wrap gap-2">
            {(dsl.restricted_reasons_for_retry || [
              'CARD_STOLEN',
              'ACCOUNT_BLOCKED',
              'FRAUD_SUSPECTED',
            ]).map((reason: string) => (
              <span
                key={reason}
                className="rounded-lg bg-rose-500/10 px-3 py-1 font-mono text-xs font-semibold text-rose-300 border border-rose-500/20"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Policy DSL View */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <FileCode className="h-4 w-4 text-indigo-400" />
          Active Policy DSL Schema & Rules Definition
        </h3>
        <pre className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-indigo-300 border border-slate-800 overflow-x-auto">
          {JSON.stringify(dsl, null, 2)}
        </pre>
      </div>
    </div>
  );
}
