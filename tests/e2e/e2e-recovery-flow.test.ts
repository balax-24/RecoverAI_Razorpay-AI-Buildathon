import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { RazorpayAdapter } from '../../packages/payments/src';
import { RecoveryOrchestrator } from '../../packages/ai/src';
import { PolicyEngine } from '../../packages/policies/src';
import { canTransitionRecovery, canTransitionPayment } from '../../packages/domain/src';
import { generateCustomerRecoveryToken, hashToken } from '../../packages/security/src';

describe('Phase 35: End-to-End Razorpay Recovery Flow Verification', () => {
  const webhookSecret = 'test_webhook_secret_phase35';
  const adapter = new RazorpayAdapter({
    keyId: 'rzp_test_phase35',
    keySecret: 'secret_phase35',
    webhookSecret,
  });
  const orchestrator = new RecoveryOrchestrator({ provider: 'mock' });
  const policyEngine = new PolicyEngine();

  const standardPolicy = {
    max_retries: 3,
    max_discount_inr: 100,
    cooldown_hours: 6,
    high_value_threshold_inr: 10000,
    allowed_actions: ['SMART_RETRY', 'PAYMENT_LINK', 'CUSTOMER_MESSAGING', 'INCENTIVE_OFFER'] as any,
    restricted_reasons_for_retry: ['CARD_STOLEN', 'ACCOUNT_BLOCKED'],
  };

  it('Complete Flow: Payment Failed Webhook -> Verification -> AI Strategy -> Policy -> Token -> Recovered', async () => {
    // 1. Webhook Payload Generation
    const paymentId = `pay_e2e_${crypto.randomBytes(4).toString('hex')}`;
    const rawPayloadObj = {
      entity: 'event',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            entity: 'payment',
            amount: 320000, // ₹3,200
            currency: 'INR',
            status: 'failed',
            error_code: 'BAD_REQUEST_GATEWAY_TIMEOUT',
            error_reason: 'gateway_timeout',
            email: 'customer@example.com',
          },
        },
      },
    };
    const rawBuffer = Buffer.from(JSON.stringify(rawPayloadObj), 'utf8');

    // 2. Cryptographic HMAC Verification
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBuffer).digest('hex');
    const isSignatureValid = adapter.verifyWebhookSignature(rawBuffer, signature, webhookSecret);
    expect(isSignatureValid).toBe(true);

    // 3. AI Bounded Context Evaluation
    const boundedContext = {
      caseId: 'case_e2e_001',
      amountInr: 3200,
      currency: 'INR',
      failureReason: 'gateway_timeout',
      failureCategory: 'TEMPORARY_NETWORK' as const,
      attemptCount: 0,
      customerLtvTier: 'STANDARD' as const,
      hoursSinceFailure: 0.1,
      merchantPolicySummary: {
        maxRetries: 3,
        maxDiscountInr: 100,
        canOfferIncentive: true,
      },
    };

    const aiResult = await orchestrator.evaluateRecoveryStrategy(boundedContext);
    expect(aiResult.recommendation.recommendedAction).toBe('SMART_RETRY');
    expect(aiResult.latencyMs).toBeLessThan(50);

    // 4. Policy Engine Evaluation
    const policyResult = policyEngine.evaluate(
      {
        caseId: 'case_e2e_001',
        amountInr: 3200,
        reasonCode: 'gateway_timeout',
        attemptCount: 0,
        lastActionAt: null,
        proposedAction: aiResult.recommendation.recommendedAction,
      },
      standardPolicy
    );
    expect(policyResult.decision).toBe('ALLOW');

    // 5. Token Generation for Recovery Link
    const { rawToken, tokenHash } = generateCustomerRecoveryToken();
    expect(rawToken).toHaveLength(64);
    expect(tokenHash).toBe(hashToken(rawToken));

    // 6. Payment Success & FSM Convergence
    const canRecover = canTransitionRecovery('ACTION_EXECUTED', 'RECOVERED');
    expect(canRecover).toBe(true);

    const canPaymentCapture = canTransitionPayment('FAILED', 'CAPTURED');
    expect(canPaymentCapture).toBe(true);
  });
});
