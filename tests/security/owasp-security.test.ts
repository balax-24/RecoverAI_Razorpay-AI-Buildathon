import { describe, it, expect } from 'vitest';
import { encryptString, decryptString, hashToken } from '../../packages/security/src';
import { PolicyEngine } from '../../packages/policies/src';
import { canTransitionRecovery, canTransitionPayment } from '../../packages/domain/src';

describe('OWASP ASVS 5.0.0 & Financial Invariant Tests', () => {
  const hexKey = 'a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f890';

  describe('V1: Cryptography & Secrets Handling', () => {
    it('should encrypt and decrypt sensitive strings with AES-256-GCM authenticated tags', () => {
      const plaintext = 'rzp_live_secret_key_12345';
      const encrypted = encryptString(plaintext, hexKey);

      expect(encrypted).not.toContain(plaintext);
      expect(encrypted.split(':')).toHaveLength(3); // iv:tag:data

      const decrypted = decryptString(encrypted, hexKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate collision-resistant, deterministic token hashes', () => {
      const token = 'recovery_token_secure_999';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('V2: Policy Engine & Maker-Checker Limits', () => {
    const policyEngine = new PolicyEngine();
    const rules = {
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
      restricted_reasons_for_retry: ['CARD_STOLEN', 'ACCOUNT_BLOCKED'],
    };

    it('should mandate human approval for transactions >= high_value_threshold_inr (₹10,000)', () => {
      const result = policyEngine.evaluate(
        {
          caseId: 'case_1',
          amountInr: 15000,
          reasonCode: 'NETWORK_TIMEOUT',
          attemptCount: 1,
          lastActionAt: null,
          proposedAction: 'SMART_RETRY',
        },
        rules
      );

      expect(result.decision).toBe('APPROVAL_REQUIRED');
      expect(result.violatedRules).toContain('HIGH_VALUE_THRESHOLD_EXCEEDED');
    });

    it('should block smart retry if reason is in restricted reasons list (e.g. CARD_STOLEN)', () => {
      const result = policyEngine.evaluate(
        {
          caseId: 'case_2',
          amountInr: 2500,
          reasonCode: 'CARD_STOLEN',
          attemptCount: 0,
          lastActionAt: null,
          proposedAction: 'SMART_RETRY',
        },
        rules
      );

      expect(result.decision).toBe('BLOCK');
      expect(result.violatedRules).toContain('RETRY_RESTRICTED_FOR_REASON');
    });

    it('should block discount if it exceeds max allowed limit (₹100)', () => {
      const result = policyEngine.evaluate(
        {
          caseId: 'case_3',
          amountInr: 2500,
          reasonCode: 'GATEWAY_TIMEOUT',
          attemptCount: 1,
          lastActionAt: null,
          proposedAction: 'INCENTIVE_OFFER',
          proposedDiscountInr: 250,
        },
        rules
      );

      expect(result.decision).toBe('BLOCK');
      expect(result.violatedRules).toContain('DISCOUNT_EXCEEDS_POLICY_MAX');
    });
  });

  describe('V3: FSM State Machine Invariants', () => {
    it('should allow valid forward transitions', () => {
      expect(canTransitionRecovery('PENDING', 'EVALUATING')).toBe(true);
      expect(canTransitionRecovery('EVALUATING', 'ACTION_SCHEDULED')).toBe(true);
      expect(canTransitionRecovery('ACTION_SCHEDULED', 'ACTION_EXECUTED')).toBe(true);
      expect(canTransitionRecovery('ACTION_EXECUTED', 'RECOVERED')).toBe(true);
    });

    it('should strictly reject invalid backwards transitions from terminal states', () => {
      expect(canTransitionRecovery('RECOVERED', 'PENDING')).toBe(false);
      expect(canTransitionRecovery('EXHAUSTED', 'EVALUATING')).toBe(false);
      expect(canTransitionRecovery('BLOCKED', 'ACTION_SCHEDULED')).toBe(false);
    });

    it('should allow late capture convergence on payment state machine', () => {
      expect(canTransitionPayment('FAILED', 'CAPTURED')).toBe(true);
    });
  });
});
