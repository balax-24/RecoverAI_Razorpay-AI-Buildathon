import { RecoveryActionType } from '@recoverai/domain';
import { PolicyRulesDsl } from '@recoverai/validation';

export interface PolicyEvaluationInput {
  caseId: string;
  amountInr: number;
  reasonCode: string;
  attemptCount: number;
  lastActionAt: Date | null;
  proposedAction: RecoveryActionType;
  proposedDiscountInr?: number;
  isSafeMode?: boolean;
}

export interface PolicyEvaluationResult {
  decision: 'ALLOW' | 'BLOCK' | 'APPROVAL_REQUIRED';
  policyId?: string;
  violatedRules: string[];
  reason: string;
  appliedLimits: {
    maxRetries: number;
    maxDiscountInr: number;
    cooldownHours: number;
    highValueThresholdInr: number;
  };
}

export class PolicyEngine {
  /**
   * Evaluates proposed recovery action against deterministic merchant policy
   */
  public evaluate(
    input: PolicyEvaluationInput,
    rules: PolicyRulesDsl,
    policyId?: string
  ): PolicyEvaluationResult {
    const violatedRules: string[] = [];

    const limits = {
      maxRetries: rules.max_retries,
      maxDiscountInr: rules.max_discount_inr,
      cooldownHours: rules.cooldown_hours,
      highValueThresholdInr: rules.high_value_threshold_inr,
    };

    // 1. Safe Mode check: routes all actions to human approval
    if (input.isSafeMode) {
      return {
        decision: 'APPROVAL_REQUIRED',
        policyId,
        violatedRules: ['SAFE_MODE_ENABLED'],
        reason: 'Safe Mode is active; all automated financial actions require human approval',
        appliedLimits: limits,
      };
    }

    // 2. High Value Transaction Check (> high_value_threshold_inr)
    if (input.amountInr >= rules.high_value_threshold_inr) {
      return {
        decision: 'APPROVAL_REQUIRED',
        policyId,
        violatedRules: ['HIGH_VALUE_THRESHOLD_EXCEEDED'],
        reason: `Payment amount ₹${input.amountInr.toLocaleString('en-IN')} exceeds high-value threshold of ₹${rules.high_value_threshold_inr.toLocaleString('en-IN')}; maker-checker approval required`,
        appliedLimits: limits,
      };
    }

    // 3. Max Retry Attempts Limit
    if (input.proposedAction === 'SMART_RETRY' && input.attemptCount >= rules.max_retries) {
      violatedRules.push('MAX_RETRIES_EXCEEDED');
    }

    // 4. Restricted Reasons for Smart Retry (e.g. Card Stolen, Fraud)
    if (
      input.proposedAction === 'SMART_RETRY' &&
      rules.restricted_reasons_for_retry.includes(input.reasonCode)
    ) {
      violatedRules.push('RETRY_RESTRICTED_FOR_REASON');
    }

    // 5. Max Discount Incentive Limit
    if (
      input.proposedDiscountInr !== undefined &&
      input.proposedDiscountInr > rules.max_discount_inr
    ) {
      violatedRules.push('DISCOUNT_EXCEEDS_POLICY_MAX');
    }

    // 6. Action Allowed Whitelist
    if (!rules.allowed_actions.includes(input.proposedAction)) {
      violatedRules.push('ACTION_NOT_IN_POLICY_WHITELIST');
    }

    // 7. Manual intervention action always requires approval
    if (input.proposedAction === 'MANUAL_INTERVENTION') {
      return {
        decision: 'APPROVAL_REQUIRED',
        policyId,
        violatedRules: [],
        reason: 'Action type requires manual operator review',
        appliedLimits: limits,
      };
    }

    // Final Decision
    if (violatedRules.length > 0) {
      return {
        decision: 'BLOCK',
        policyId,
        violatedRules,
        reason: `Action blocked by policy rules: ${violatedRules.join(', ')}`,
        appliedLimits: limits,
      };
    }

    return {
      decision: 'ALLOW',
      policyId,
      violatedRules: [],
      reason: 'Action conforms with all deterministic policy limits',
      appliedLimits: limits,
    };
  }
}
