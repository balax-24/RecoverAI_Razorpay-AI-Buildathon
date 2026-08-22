// Enums
export type UserRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'ANALYST' | 'VIEWER';

export type PaymentStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED';

export type RecoveryStatus =
  | 'PENDING'
  | 'EVALUATING'
  | 'ACTION_SCHEDULED'
  | 'ACTION_EXECUTED'
  | 'IN_GRACE_PERIOD'
  | 'PENDING_APPROVAL'
  | 'RECOVERED'
  | 'EXHAUSTED'
  | 'BLOCKED'
  | 'CANCELLED';

export type RecoveryActionType =
  | 'SMART_RETRY'
  | 'PAYMENT_LINK'
  | 'CUSTOMER_MESSAGING'
  | 'INCENTIVE_OFFER'
  | 'MANUAL_INTERVENTION';

export type ActionExecutionStatus =
  | 'SCHEDULED'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED'
  | 'REJECTED';

export type ApprovalStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export type ActorType =
  | 'USER'
  | 'AI_AGENT'
  | 'SYSTEM'
  | 'WEBHOOK'
  | 'WORKER'
  | 'ADMIN';

export type FailureCategory =
  | 'TEMPORARY_NETWORK'
  | 'INSUFFICIENT_FUNDS'
  | 'AUTHENTICATION'
  | 'PERMANENT_REJECT'
  | 'UNKNOWN';

// Recovery State Machine Transitions
export const VALID_RECOVERY_TRANSITIONS: Record<RecoveryStatus, RecoveryStatus[]> = {
  PENDING: ['EVALUATING', 'BLOCKED', 'EXHAUSTED', 'CANCELLED'],
  EVALUATING: ['ACTION_SCHEDULED', 'PENDING_APPROVAL', 'BLOCKED', 'EXHAUSTED', 'CANCELLED'],
  PENDING_APPROVAL: ['ACTION_SCHEDULED', 'EXHAUSTED', 'CANCELLED'],
  ACTION_SCHEDULED: ['ACTION_EXECUTED', 'CANCELLED', 'EXHAUSTED'],
  ACTION_EXECUTED: ['IN_GRACE_PERIOD', 'EXHAUSTED', 'RECOVERED'],
  IN_GRACE_PERIOD: ['RECOVERED', 'PENDING', 'EXHAUSTED', 'CANCELLED'],
  RECOVERED: [], // Terminal
  EXHAUSTED: [], // Terminal
  BLOCKED: [],   // Terminal
  CANCELLED: [], // Terminal
};

export function canTransitionRecovery(
  from: RecoveryStatus,
  to: RecoveryStatus
): boolean {
  return VALID_RECOVERY_TRANSITIONS[from]?.includes(to) ?? false;
}

// Payment State Machine Transitions & Convergence
export const VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: ['AUTHORIZED', 'CAPTURED', 'FAILED'],
  AUTHORIZED: ['CAPTURED', 'FAILED'],
  CAPTURED: ['REFUNDED'],
  FAILED: ['CAPTURED'], // Allows convergence on late capture
  REFUNDED: [],         // Terminal
};

export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus
): boolean {
  return VALID_PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

// Domain Invariant Error
export class DomainInvariantViolation extends Error {
  constructor(public readonly code: string, message: string) {
    super(`[Invariant Violation] ${code}: ${message}`);
    this.name = 'DomainInvariantViolation';
  }
}
