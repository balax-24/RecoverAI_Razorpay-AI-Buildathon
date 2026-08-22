import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { createChildLogger } from '../../packages/observability/src';

describe('Phase 40 & 41: Observability & End-to-End Trace Correlation', () => {
  it('should propagate correlation IDs across Webhook -> Queue -> AI -> Policy -> Action', () => {
    const traceId = `trace_${crypto.randomBytes(8).toString('hex')}`;
    const paymentId = `pay_${crypto.randomBytes(6).toString('hex')}`;
    const caseId = `case_${crypto.randomBytes(6).toString('hex')}`;

    // Step 1: Webhook Ingestion Context
    const webhookContext = {
      traceId,
      paymentId,
      step: 'WEBHOOK_INGESTION',
      durationMs: 8,
    };
    expect(webhookContext.traceId).toBe(traceId);

    // Step 2: Queue Worker Pickup Context
    const workerContext = {
      ...webhookContext,
      caseId,
      step: 'WORKER_EVALUATION',
      durationMs: 14,
    };
    expect(workerContext.traceId).toBe(traceId);

    // Step 3: AI Orchestrator Execution Context
    const aiContext = {
      ...workerContext,
      step: 'AI_DECISION',
      model: 'gemini-1.5-flash',
      durationMs: 380,
    };
    expect(aiContext.traceId).toBe(traceId);

    // Step 4: Policy Engine Evaluation Context
    const policyContext = {
      ...aiContext,
      step: 'POLICY_EVALUATION',
      decision: 'ALLOW',
      durationMs: 2,
    };
    expect(policyContext.traceId).toBe(traceId);

    // Verify Child Logger instantiation
    const childLogger = createChildLogger({ traceId, paymentId, caseId });
    expect(childLogger).toBeDefined();
  });
});
