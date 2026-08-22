import { describe, it, expect } from 'vitest';
import { RecoveryOrchestrator, BoundedRecoveryContext } from '../../packages/ai/src';

describe('AI Decision Engine — Golden Benchmark Evaluation Suite', () => {
  const orchestrator = new RecoveryOrchestrator({ provider: 'mock' });

  it('Scenario 1: Temporary Network Glitch -> Recommends SMART_RETRY', async () => {
    const context: BoundedRecoveryContext = {
      caseId: 'bench_case_001',
      amountInr: 1499,
      currency: 'INR',
      failureReason: 'NETWORK_TIMEOUT_RETRYABLE',
      failureCategory: 'TEMPORARY_NETWORK',
      attemptCount: 0,
      customerLtvTier: 'STANDARD',
      hoursSinceFailure: 0.1,
      merchantPolicySummary: {
        maxRetries: 3,
        maxDiscountInr: 50,
        canOfferIncentive: true,
      },
    };

    const result = await orchestrator.evaluateRecoveryStrategy(context);
    expect(result.recommendation.recommendedAction).toBe('SMART_RETRY');
    expect(result.recommendation.confidenceScore).toBeGreaterThanOrEqual(0.8);
    expect(result.recommendation.requiresHumanReview).toBe(false);
  });

  it('Scenario 2: Insufficient Funds -> Recommends PAYMENT_LINK without discount', async () => {
    const context: BoundedRecoveryContext = {
      caseId: 'bench_case_002',
      amountInr: 4500,
      currency: 'INR',
      failureReason: 'PAYMENT_FAILED_INSUFFICIENT_FUNDS',
      failureCategory: 'INSUFFICIENT_FUNDS',
      attemptCount: 1,
      customerLtvTier: 'VALUED',
      hoursSinceFailure: 2,
      merchantPolicySummary: {
        maxRetries: 3,
        maxDiscountInr: 100,
        canOfferIncentive: true,
      },
    };

    const result = await orchestrator.evaluateRecoveryStrategy(context);
    expect(result.recommendation.recommendedAction).toBe('PAYMENT_LINK');
    expect(result.recommendation.parameters.messageChannel).toBe('EMAIL');
  });

  it('Scenario 3: Max Retries Exhausted -> Routes to Manual Intervention', async () => {
    const context: BoundedRecoveryContext = {
      caseId: 'bench_case_003',
      amountInr: 8500,
      currency: 'INR',
      failureReason: 'BANK_DECLINED_UNKNOWN',
      failureCategory: 'UNKNOWN',
      attemptCount: 3,
      customerLtvTier: 'VIP',
      hoursSinceFailure: 24,
      merchantPolicySummary: {
        maxRetries: 3,
        maxDiscountInr: 100,
        canOfferIncentive: true,
      },
    };

    const result = await orchestrator.evaluateRecoveryStrategy(context);
    expect(result.recommendation.recommendedAction).toBe('MANUAL_INTERVENTION');
    expect(result.recommendation.requiresHumanReview).toBe(true);
  });
});
