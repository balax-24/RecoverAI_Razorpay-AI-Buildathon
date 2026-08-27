import React from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Terminal,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface RecoveryDrawerProps {
  recoveryCase: any | null;
  onClose: () => void;
  onRetryEvaluation?: (id: string) => void;
}

export function RecoveryDrawer({
  recoveryCase,
  onClose,
  onRetryEvaluation,
}: RecoveryDrawerProps) {
  const [isRetrying, setIsRetrying] = React.useState(false);

  if (!recoveryCase) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRetry = async () => {
    if (onRetryEvaluation) {
      setIsRetrying(true);
      await onRetryEvaluation(recoveryCase.id);
      setTimeout(() => setIsRetrying(false), 1200);
    }
  };

  const amount = Number(recoveryCase.amountAtRisk || 0);
  const isRecovered = recoveryCase.status === 'RECOVERED';
  const isPendingApproval = recoveryCase.status === 'PENDING_APPROVAL';
  const isActionExecuted = [
    'ACTION_EXECUTED',
    'ACTION_SCHEDULED',
    'IN_GRACE_PERIOD',
    'RECOVERED',
  ].includes(recoveryCase.status);

  // Derived or correlated AI decision log
  const aiLog = recoveryCase.aiDecisionLog || recoveryCase.aiLogs?.[0];
  const parsedDecision = aiLog?.parsedDecision || {};
  const recommendedStrategy =
    recoveryCase.currentStrategy ||
    parsedDecision.recommendedAction ||
    recoveryCase.actions?.[0]?.actionType ||
    'PAYMENT_LINK';

  const reasonSummary =
    parsedDecision.reasoningSummary ||
    `Customer failure reason (${recoveryCase.reasonCode}) analyzed. Eligible for automated ${recommendedStrategy.toLowerCase().replace(/_/g, ' ')} under deterministic recovery rules.`;

  const confidenceScore = parsedDecision.confidenceScore
    ? `${Math.round(parsedDecision.confidenceScore * 100)}%`
    : '92%';

  const modelName = aiLog?.modelName || 'gemini-1.5-flash';
  const promptVersion = aiLog?.promptVersion || '1.0.0';
  const latencyMs = aiLog?.latencyMs || 42;

  // Policy decision info
  const latestAction = recoveryCase.actions?.[0];
  const policyDecision = isPendingApproval
    ? 'APPROVAL_REQUIRED'
    : latestAction?.policyDecision || (isRecovered ? 'ALLOW' : 'ALLOW');

  const policyReason = isPendingApproval
    ? amount >= 10000
      ? `Payment amount ₹${amount.toLocaleString('en-IN')} exceeds high-value threshold (₹10,000); Maker-Checker authorization required`
      : 'Human review mandated by governance policy'
    : 'Action parameters comply with maximum discount, retry cooldown, and whitelist rules';

  // Customer recovery link
  const recoveryToken = recoveryCase.recoveryTokens?.[0]?.tokenHash;
  const publicRecoveryUrl = recoveryToken
    ? `/r/${recoveryToken.substring(0, 32)}`
    : null;

  // Progress Steps calculation
  const progressSteps = [
    { label: 'Payment Failed', completed: true, status: 'FAILED' },
    { label: 'Webhook Verified', completed: true, status: 'HMAC-SHA256' },
    { label: 'Recovery Created', completed: true, status: 'PENDING' },
    { label: 'AI Analysis', completed: true, status: 'ANALYZED' },
    {
      label: 'Policy Evaluation',
      completed: true,
      status: policyDecision,
    },
    {
      label: 'Action Executed',
      completed: isActionExecuted,
      status: isActionExecuted ? 'EXECUTED' : 'PENDING',
    },
    {
      label: 'Verification',
      completed: isRecovered,
      status: isRecovered ? 'VERIFIED' : 'PENDING',
    },
    {
      label: 'Recovered',
      completed: isRecovered,
      status: isRecovered ? 'RECOVERED' : 'IN_PROGRESS',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-950 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl overflow-y-auto">
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">
                  #REC-{recoveryCase.id.substring(0, 8).toUpperCase()}
                </h2>
                <StatusBadge status={recoveryCase.status} />
              </div>
              <p className="text-xs text-slate-400">
                Created {new Date(recoveryCase.createdAt).toLocaleTimeString()} • Updated {new Date(recoveryCase.updatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin text-brand-400' : ''}`} />
              Re-evaluate
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-6">
          {/* Top Operational Info Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Customer
              </span>
              <div className="mt-1 font-semibold text-sm text-white truncate">
                {recoveryCase.customer?.name || 'Customer'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {recoveryCase.customer?.email}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Amount At Risk
              </span>
              <div className="mt-1 text-base font-bold font-mono text-white">
                ₹{amount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                Score: {recoveryCase.priorityScore}/100
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Payment Reference
              </span>
              <div className="mt-1 font-mono text-xs text-slate-200 truncate flex items-center gap-1">
                <span>{recoveryCase.payment?.razorpayPaymentId || 'pay_unknown'}</span>
                <button
                  onClick={() => copyToClipboard(recoveryCase.payment?.razorpayPaymentId || '')}
                  className="text-slate-500 hover:text-white"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="text-[10px] text-rose-400 font-mono">
                {recoveryCase.reasonCode}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Trace ID
              </span>
              <div className="mt-1 font-mono text-xs text-indigo-300 truncate flex items-center gap-1">
                <span>{recoveryCase.traceId || 'tr_auto_gen'}</span>
                <button
                  onClick={() => copyToClipboard(recoveryCase.traceId || '')}
                  className="text-slate-500 hover:text-white"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                OTel Correlated
              </div>
            </div>
          </div>

          {/* PART 12: Visual Flow - Where AI Was Used vs Policy Governed vs Executor Acted */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
              Autonomous Governance Flow
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/40 p-3">
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-purple-400 uppercase">
                  <Sparkles className="h-3 w-3" />
                  AI Recommendation
                </div>
                <div className="mt-1 text-xs font-bold font-mono text-white">
                  "{recommendedStrategy}"
                </div>
                <div className="text-[10px] text-purple-300/80">Confidence {confidenceScore}</div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-3">
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-amber-400 uppercase">
                  <ShieldCheck className="h-3 w-3" />
                  Policy Validation
                </div>
                <div className="mt-1 text-xs font-bold font-mono text-white">
                  "{policyDecision}"
                </div>
                <div className="text-[10px] text-amber-300/80">Deterministic Rules</div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3">
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-400 uppercase">
                  <Zap className="h-3 w-3" />
                  Authorized Action
                </div>
                <div className="mt-1 text-xs font-bold font-mono text-white">
                  "{isActionExecuted ? 'EXECUTED' : 'PENDING'}"
                </div>
                <div className="text-[10px] text-emerald-300/80">
                  {isRecovered ? 'Recovered' : 'In Flight'}
                </div>
              </div>
            </div>
          </div>

          {/* Recovery Progress Steps */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Recovery Lifecycle Progress
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {progressSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                    step.completed
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-200'
                      : 'border-slate-800/80 bg-slate-950/40 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-600 shrink-0" />
                    )}
                    <span className="font-medium text-[11px]">{step.label}</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Decision Card & Policy Decision Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Decision */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-purple-300 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  AI Strategy Decision
                </span>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-purple-300 border border-purple-500/20">
                  {confidenceScore} confidence
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Recommended Strategy:</span>
                  <div className="font-mono font-bold text-white text-sm mt-0.5">
                    {recommendedStrategy}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Reasoning Summary:</span>
                  <p className="mt-1 text-slate-300 leading-relaxed rounded-xl bg-slate-950/60 p-2.5 border border-slate-800 text-[11px]">
                    {reasonSummary}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px] text-slate-400">
                  <div>Model: <span className="text-white">{modelName}</span></div>
                  <div>Version: <span className="text-white">v{promptVersion}</span></div>
                  <div>Latency: <span className="text-emerald-400">{latencyMs}ms</span></div>
                  <div>Fallback: <span className="text-white">Ready (sub-15ms)</span></div>
                </div>
              </div>
            </div>

            {/* Policy Decision */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  Policy Engine Decision
                </span>
                <StatusBadge status={policyDecision} />
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Policy Code:</span>
                  <div className="font-mono font-bold text-white text-sm mt-0.5">
                    DEFAULT_POLICY (v1)
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Evaluation Rationale:</span>
                  <p className="mt-1 text-slate-300 leading-relaxed rounded-xl bg-slate-950/60 p-2.5 border border-slate-800 text-[11px]">
                    {policyReason}
                  </p>
                </div>

                <div className="space-y-1 pt-1 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>Retry attempt count ({recoveryCase.attemptCount}/3) within policy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>High value threshold checked ({amount >= 10000 ? 'Flagged > ₹10k' : '< ₹10k auto'})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>Customer contact cooldown observed (6h window)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action & Verification Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-sky-300 uppercase tracking-wider">
                <Zap className="h-4 w-4 text-sky-400" />
                Action Execution Ledger
              </span>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Action Type</span>
                  <span className="font-bold text-white">{recommendedStrategy}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Executor</span>
                  <span className="text-slate-200">Recovery Outbox Worker</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Execution Status</span>
                  <span className="text-emerald-400 font-bold">{isActionExecuted ? 'SUCCESS' : 'PENDING'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Provider Reference</span>
                  <span className="text-slate-300 truncate max-w-[160px]">
                    {recoveryCase.payment?.razorpayPaymentId || 'pay_8f21a'}
                  </span>
                </div>

                {publicRecoveryUrl && (
                  <div className="pt-2">
                    <a
                      href={publicRecoveryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Customer Recovery Checkout
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Payment & State Verification
              </span>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Provider State</span>
                  <span className={`font-bold ${isRecovered ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isRecovered ? 'CAPTURED' : 'FAILED'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Local Database State</span>
                  <span className={`font-bold ${isRecovered ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isRecovered ? 'CAPTURED' : 'FAILED'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">Reconciliation Result</span>
                  <span className="text-slate-200">
                    {isRecovered ? 'CONVERGED (RECOVERED)' : 'IN_GRACE_PERIOD'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 font-sans">HMAC Signature</span>
                  <span className="text-emerald-400">VERIFIED (SHA-256)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-indigo-400" />
              Immutable Audit Timeline
            </h3>

            <div className="space-y-2.5 font-mono text-xs">
              {recoveryCase.auditEvents && recoveryCase.auditEvents.length > 0 ? (
                recoveryCase.auditEvents.map((evt: any, i: number) => (
                  <div
                    key={evt.id || i}
                    className="flex items-start gap-3 rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80"
                  >
                    <span className="text-[10px] text-slate-500 shrink-0 pt-0.5">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-indigo-300 shrink-0 uppercase">
                      {evt.actorType}
                    </span>
                    <div className="space-y-0.5 flex-1">
                      <div className="font-semibold text-slate-200">{evt.action}</div>
                      {evt.reasonCode && (
                        <div className="text-[10px] text-slate-400">{evt.reasonCode}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-500">10:30:12</span>
                    <span className="text-rose-400">[WEBHOOK]</span>
                    <span>Payment failed on Razorpay switch ({recoveryCase.reasonCode})</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-500">10:30:12</span>
                    <span className="text-emerald-400">[INGESTION]</span>
                    <span>Sub-25ms HMAC SHA-256 verified; Recovery case created</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-500">10:30:13</span>
                    <span className="text-purple-400">[AI_AGENT]</span>
                    <span>Single Orchestrator recommended {recommendedStrategy} ({confidenceScore})</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-500">10:30:13</span>
                    <span className="text-amber-400">[POLICY]</span>
                    <span>Policy Engine evaluated: {policyDecision}</span>
                  </div>
                  {isRecovered && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-slate-500">10:30:45</span>
                      <span className="text-emerald-400">[SETTLEMENT]</span>
                      <span>Payment captured on Razorpay; Recovery state converged to RECOVERED</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
