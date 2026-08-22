import { describe, it, expect } from 'vitest';
import { RecoveryOrchestrator, BoundedRecoveryContext } from '../../packages/ai/src';
import { PolicyEngine } from '../../packages/policies/src';

describe('RecoverAI 50-Scenario Golden Benchmark Evaluation Suite', () => {
  const orchestrator = new RecoveryOrchestrator({ provider: 'mock' });
  const policyEngine = new PolicyEngine();
  const defaultPolicy = {
    max_retries: 3,
    max_discount_inr: 100,
    cooldown_hours: 6,
    high_value_threshold_inr: 10000,
    allowed_actions: [
      'SMART_RETRY',
      'PAYMENT_LINK',
      'CUSTOMER_MESSAGING',
      'INCENTIVE_OFFER',
    ] as any,
    restricted_reasons_for_retry: ['CARD_STOLEN', 'ACCOUNT_BLOCKED', 'FRAUD_SUSPECTED'],
  };

  const scenarios: {
    id: string;
    amountInr: number;
    category: 'TEMPORARY_NETWORK' | 'INSUFFICIENT_FUNDS' | 'AUTHENTICATION' | 'PERMANENT_REJECT' | 'UNKNOWN';
    reason: string;
    attemptCount: number;
    expectedAction: string;
    expectHumanReview: boolean;
  }[] = [
    // 1-10: Network and Gateway Timeout Scenarios (Early attempts)
    { id: 'SC-01', amountInr: 499, category: 'TEMPORARY_NETWORK', reason: 'GATEWAY_TIMEOUT', attemptCount: 0, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-02', amountInr: 999, category: 'TEMPORARY_NETWORK', reason: 'NETWORK_TIMEOUT', attemptCount: 1, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-03', amountInr: 1499, category: 'TEMPORARY_NETWORK', reason: 'BANK_SERVER_UNREACHABLE', attemptCount: 0, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-04', amountInr: 2999, category: 'TEMPORARY_NETWORK', reason: 'NETWORK_ERROR', attemptCount: 1, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-05', amountInr: 3499, category: 'TEMPORARY_NETWORK', reason: 'CONNECTION_RESET_BY_PEER', attemptCount: 0, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-06', amountInr: 4999, category: 'TEMPORARY_NETWORK', reason: 'GATEWAY_TIMEOUT', attemptCount: 1, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-07', amountInr: 5999, category: 'TEMPORARY_NETWORK', reason: 'INTERNAL_SWITCH_ERROR', attemptCount: 0, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-08', amountInr: 7499, category: 'TEMPORARY_NETWORK', reason: 'NETWORK_TIMEOUT', attemptCount: 1, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-09', amountInr: 8999, category: 'TEMPORARY_NETWORK', reason: 'GATEWAY_TIMEOUT', attemptCount: 0, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-10', amountInr: 9500, category: 'TEMPORARY_NETWORK', reason: 'NPCI_UPI_TIMEOUT', attemptCount: 1, expectedAction: 'SMART_RETRY', expectHumanReview: false },

    // 11-20: Insufficient Funds & Customer Action Required Scenarios
    { id: 'SC-11', amountInr: 800, category: 'INSUFFICIENT_FUNDS', reason: 'PAYMENT_FAILED_INSUFFICIENT_FUNDS', attemptCount: 0, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-12', amountInr: 1200, category: 'INSUFFICIENT_FUNDS', reason: 'INSUFFICIENT_BALANCE', attemptCount: 0, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-13', amountInr: 2100, category: 'INSUFFICIENT_FUNDS', reason: 'INSUFFICIENT_FUNDS', attemptCount: 1, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-14', amountInr: 3200, category: 'INSUFFICIENT_FUNDS', reason: 'LOW_BALANCE', attemptCount: 0, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-15', amountInr: 4500, category: 'INSUFFICIENT_FUNDS', reason: 'INSUFFICIENT_BALANCE', attemptCount: 1, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-16', amountInr: 5100, category: 'INSUFFICIENT_FUNDS', reason: 'INSUFFICIENT_FUNDS', attemptCount: 0, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-17', amountInr: 6800, category: 'INSUFFICIENT_FUNDS', reason: 'ACCOUNT_LIMIT_EXCEEDED', attemptCount: 0, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-18', amountInr: 7900, category: 'INSUFFICIENT_FUNDS', reason: 'DAILY_LIMIT_REACHED', attemptCount: 0, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-19', amountInr: 8500, category: 'INSUFFICIENT_FUNDS', reason: 'INSUFFICIENT_FUNDS', attemptCount: 1, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-20', amountInr: 9900, category: 'INSUFFICIENT_FUNDS', reason: 'INSUFFICIENT_BALANCE', attemptCount: 0, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },

    // 21-30: Multiple Previous Attempts Escalated Scenarios
    { id: 'SC-21', amountInr: 650, category: 'TEMPORARY_NETWORK', reason: 'GATEWAY_TIMEOUT', attemptCount: 2, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-22', amountInr: 1850, category: 'AUTHENTICATION', reason: 'OTP_EXPIRED', attemptCount: 2, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-23', amountInr: 2400, category: 'AUTHENTICATION', reason: 'AUTHENTICATION_FAILED', attemptCount: 2, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-24', amountInr: 3990, category: 'UNKNOWN', reason: 'DECLINED', attemptCount: 2, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-25', amountInr: 5200, category: 'TEMPORARY_NETWORK', reason: 'NETWORK_TIMEOUT', attemptCount: 2, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-26', amountInr: 6100, category: 'AUTHENTICATION', reason: '3DS_FAILED', attemptCount: 2, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-27', amountInr: 7400, category: 'UNKNOWN', reason: 'BANK_REJECT', attemptCount: 2, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-28', amountInr: 8200, category: 'AUTHENTICATION', reason: 'USER_ABORTED', attemptCount: 2, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-29', amountInr: 9100, category: 'TEMPORARY_NETWORK', reason: 'GATEWAY_TIMEOUT', attemptCount: 2, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-30', amountInr: 9800, category: 'UNKNOWN', reason: 'TRANSACTION_REJECTED', attemptCount: 2, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },

    // 31-40: Max Retries Exhausted (attemptCount >= 3) -> Route to Manual Intervention
    { id: 'SC-31', amountInr: 500, category: 'TEMPORARY_NETWORK', reason: 'GATEWAY_TIMEOUT', attemptCount: 3, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-32', amountInr: 1200, category: 'INSUFFICIENT_FUNDS', reason: 'INSUFFICIENT_FUNDS', attemptCount: 3, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-33', amountInr: 2500, category: 'AUTHENTICATION', reason: 'OTP_EXPIRED', attemptCount: 3, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-34', amountInr: 3800, category: 'UNKNOWN', reason: 'BANK_DECLINE', attemptCount: 3, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-35', amountInr: 4900, category: 'PERMANENT_REJECT', reason: 'CARD_BLOCKED', attemptCount: 3, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-36', amountInr: 5600, category: 'TEMPORARY_NETWORK', reason: 'TIMEOUT', attemptCount: 4, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-37', amountInr: 6700, category: 'INSUFFICIENT_FUNDS', reason: 'LOW_BALANCE', attemptCount: 4, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-38', amountInr: 7800, category: 'AUTHENTICATION', reason: '3DS_FAILED', attemptCount: 4, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-39', amountInr: 8900, category: 'UNKNOWN', reason: 'FAILED', attemptCount: 4, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-40', amountInr: 9999, category: 'PERMANENT_REJECT', reason: 'ACCOUNT_CLOSED', attemptCount: 3, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },

    // 41-50: High-Value Edge Cases & Policy Guard Checks
    { id: 'SC-41', amountInr: 12000, category: 'TEMPORARY_NETWORK', reason: 'GATEWAY_TIMEOUT', attemptCount: 0, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-42', amountInr: 15000, category: 'INSUFFICIENT_FUNDS', reason: 'INSUFFICIENT_FUNDS', attemptCount: 0, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-43', amountInr: 25000, category: 'AUTHENTICATION', reason: 'OTP_EXPIRED', attemptCount: 1, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-44', amountInr: 50000, category: 'UNKNOWN', reason: 'HIGH_VALUE_HOLD', attemptCount: 0, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-45', amountInr: 75000, category: 'PERMANENT_REJECT', reason: 'LIMIT_EXCEEDED', attemptCount: 0, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-46', amountInr: 100000, category: 'UNKNOWN', reason: 'ENTERPRISE_INVOICE_FAILED', attemptCount: 1, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-47', amountInr: 150000, category: 'TEMPORARY_NETWORK', reason: 'SWITCH_TIMEOUT', attemptCount: 0, expectedAction: 'SMART_RETRY', expectHumanReview: false },
    { id: 'SC-48', amountInr: 200000, category: 'INSUFFICIENT_FUNDS', reason: 'INSUFFICIENT_FUNDS', attemptCount: 2, expectedAction: 'PAYMENT_LINK', expectHumanReview: false },
    { id: 'SC-49', amountInr: 350000, category: 'AUTHENTICATION', reason: 'CORPORATE_AUTH_TIMEOUT', attemptCount: 3, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
    { id: 'SC-50', amountInr: 500000, category: 'UNKNOWN', reason: 'MANUAL_INTERVENTION_REQUIRED', attemptCount: 0, expectedAction: 'MANUAL_INTERVENTION', expectHumanReview: true },
  ];

  scenarios.forEach((s) => {
    it(`[${s.id}] Amount ₹${s.amountInr} | ${s.category} | Attempt ${s.attemptCount} -> ${s.expectedAction}`, async () => {
      const context: BoundedRecoveryContext = {
        caseId: `bench_${s.id}`,
        amountInr: s.amountInr,
        currency: 'INR',
        failureReason: s.reason,
        failureCategory: s.category,
        attemptCount: s.attemptCount,
        customerLtvTier: s.amountInr > 20000 ? 'VIP' : 'STANDARD',
        hoursSinceFailure: 1,
        merchantPolicySummary: {
          maxRetries: 3,
          maxDiscountInr: 100,
          canOfferIncentive: true,
        },
      };

      const result = await orchestrator.evaluateRecoveryStrategy(context);
      expect(result.recommendation.recommendedAction).toBe(s.expectedAction);
      expect(result.recommendation.requiresHumanReview).toBe(s.expectHumanReview);
      expect(result.latencyMs).toBeLessThanOrEqual(50);
    });
  });
});
