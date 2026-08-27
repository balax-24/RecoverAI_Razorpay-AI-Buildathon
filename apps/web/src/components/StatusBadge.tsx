import React from 'react';

export type StatusType =
  | 'PENDING'
  | 'EVALUATING'
  | 'ACTION_SCHEDULED'
  | 'ACTION_EXECUTED'
  | 'IN_GRACE_PERIOD'
  | 'PENDING_APPROVAL'
  | 'RECOVERED'
  | 'EXHAUSTED'
  | 'BLOCKED'
  | 'CANCELLED'
  | 'ALLOW'
  | 'BLOCK'
  | 'APPROVAL_REQUIRED'
  | 'SUCCESS'
  | 'FAILED'
  | 'PROCESSED'
  | 'RECEIVED'
  | 'DUPLICATE'
  | string;

interface StatusBadgeProps {
  status?: StatusType | null;
  size?: 'sm' | 'md';
}

export function StatusBadge({
  status,
  size = 'sm',
}: StatusBadgeProps) {
  // Runtime-safe normalization.
  // API data can occasionally be null/undefined even if TypeScript says string.
  const safeStatus =
    typeof status === 'string' && status.trim().length > 0
      ? status.trim()
      : 'UNKNOWN';

  const normalized = safeStatus.toUpperCase();

  let colorClasses =
    'bg-slate-800/80 text-slate-300 border-slate-700';

  let dotColor = 'bg-slate-400';

  let label = safeStatus;

  switch (normalized) {
    // SUCCESS / HEALTH
    case 'RECOVERED':
    case 'SUCCESS':
    case 'CAPTURED':
    case 'ALLOW':
    case 'PROCESSED':
    case 'MATCHED':
    case 'HEALTHY':
    case 'NOMINAL':
      colorClasses =
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      dotColor = 'bg-emerald-400';
      break;

    // PENDING / WARNING
    case 'PENDING_APPROVAL':
    case 'APPROVAL_REQUIRED':
    case 'IN_GRACE_PERIOD':
    case 'PENDING_REVIEW':
    case 'MANUAL_ATTENTION_REQUIRED':
    case 'SAFE_MODE':
    case 'WARNING':
    case 'DEGRADED':
      colorClasses =
        'bg-amber-500/10 text-amber-300 border-amber-500/20';
      dotColor = 'bg-amber-400';
      break;

    // PROCESSING
    case 'ACTION_EXECUTED':
    case 'ACTION_SCHEDULED':
    case 'SCHEDULED':
    case 'EXECUTING':
    case 'EVALUATING':
    case 'ANALYZING':
    case 'PROCESSING':
    case 'RECEIVED':
    case 'RETRYING':
    case 'VERIFYING':
      colorClasses =
        'bg-sky-500/10 text-sky-300 border-sky-500/20';
      dotColor = 'bg-sky-400 animate-pulse';
      break;

    // GENERIC PENDING
    case 'PENDING':
      colorClasses =
        'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
      dotColor = 'bg-indigo-400';
      break;

    // FAILURE / BLOCKED
    case 'FAILED':
    case 'EXHAUSTED':
    case 'BLOCKED':
    case 'BLOCK':
    case 'REJECTED':
    case 'UNHEALTHY':
    case 'DOWN':
    case 'CANCELLED':
      colorClasses =
        'bg-rose-500/10 text-rose-400 border-rose-500/20';
      dotColor = 'bg-rose-400';
      break;

    // DUPLICATE
    case 'DUPLICATE':
      colorClasses =
        'bg-purple-500/10 text-purple-300 border-purple-500/20';
      dotColor = 'bg-purple-400';
      break;

    // UNKNOWN / UNMAPPED
    default:
      colorClasses =
        'bg-slate-800/80 text-slate-300 border-slate-700';
      dotColor = 'bg-slate-400';
      break;
  }

  const padding =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-[11px]'
      : 'px-3 py-1 text-xs';

  // Safe even if an unexpected non-string value reaches the component.
  const displayLabel = String(label).replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium ${padding} ${colorClasses}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
      />

      <span>{displayLabel}</span>
    </span>
  );
}