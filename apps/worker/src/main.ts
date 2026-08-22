import { Worker, Job, Queue } from 'bullmq';
import { prisma } from '@recoverai/database';
import { RecoveryEngine } from '@recoverai/recovery';
import { RecoveryOrchestrator } from '@recoverai/ai';
import { PolicyEngine } from '@recoverai/policies';
import { generateCustomerRecoveryToken } from '@recoverai/security';
import { logger } from '@recoverai/observability';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const recoveryEngine = new RecoveryEngine();
const policyEngine = new PolicyEngine();

const aiOrchestrator = new RecoveryOrchestrator({
  provider: (process.env.AI_PROVIDER as any) || 'mock',
  apiKey: process.env.GEMINI_API_KEY,
  timeoutBudgetMs: 1500,
});

const evaluationQueue = new Queue('recovery-evaluation', { connection });
const actionQueue = new Queue('action-execution', { connection });

/**
 * 1. Webhook Processing Worker
 */
export const webhookWorker = new Worker(
  'webhook-processing',
  async (job: Job) => {
    const { webhookEventId, eventType, payload } = job.data;
    logger.info({ webhookEventId, eventType }, 'Processing webhook event');

    const paymentData = payload?.payload?.payment?.entity;
    if (!paymentData) {
      logger.warn({ webhookEventId }, 'No payment entity found in webhook payload');
      return;
    }

    // Lookup merchant organization or use fallback default
    const org = await prisma.organization.findFirst();
    if (!org) {
      logger.warn('No organization found in database');
      return;
    }

    // Upsert Customer
    let customer = await prisma.customer.findFirst({
      where: {
        organizationId: org.id,
        email: paymentData.email || 'customer@example.com',
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          organizationId: org.id,
          externalRef: `cust_${paymentData.contact || Math.random().toString(36).substring(7)}`,
          email: paymentData.email || 'customer@example.com',
          phone: paymentData.contact,
          name: paymentData.notes?.customer_name || 'Valued Customer',
          ltvAmount: 15000,
        },
      });
    }

    // Upsert Payment Record
    const paymentAmount = Number(paymentData.amount) / 100;
    const payment = await prisma.payment.upsert({
      where: { razorpayPaymentId: paymentData.id },
      create: {
        organizationId: org.id,
        customerId: customer.id,
        razorpayPaymentId: paymentData.id,
        amount: paymentAmount,
        currency: paymentData.currency || 'INR',
        status: (paymentData.status.toUpperCase() as any) || 'FAILED',
        method: paymentData.method,
        bank: paymentData.bank,
        wallet: paymentData.wallet,
        vpa: paymentData.vpa,
        errorCode: paymentData.error_code,
        errorDescription: paymentData.error_description,
        errorSource: paymentData.error_source,
        errorStep: paymentData.error_step,
        errorReason: paymentData.error_reason,
        rawEventPayload: payload,
      },
      update: {
        status: (paymentData.status.toUpperCase() as any) || 'FAILED',
        errorCode: paymentData.error_code,
        errorDescription: paymentData.error_description,
      },
    });

    // If payment failed, create or trigger RecoveryCase
    if (paymentData.status === 'failed' || eventType === 'payment.failed') {
      const recoveryCase = await recoveryEngine.createCase({
        organizationId: org.id,
        customerId: customer.id,
        paymentId: payment.id,
        amountAtRisk: paymentAmount,
        currency: paymentData.currency || 'INR',
        reasonCode: paymentData.error_reason || paymentData.error_code || 'PAYMENT_FAILED',
      });

      // Enqueue evaluation
      await evaluationQueue.add('evaluate-case', {
        caseId: recoveryCase.id,
        organizationId: org.id,
      });
    }

    // If payment captured, resolve any active recovery case
    if (paymentData.status === 'captured' || eventType === 'payment.captured') {
      const activeCase = await prisma.recoveryCase.findFirst({
        where: {
          organizationId: org.id,
          customerId: customer.id,
          status: { in: ['PENDING', 'ACTION_SCHEDULED', 'IN_GRACE_PERIOD'] },
        },
      });

      if (activeCase) {
        await recoveryEngine.transitionStatus(
          activeCase.id,
          'RECOVERED',
          `Captured payment ${paymentData.id} confirmed via webhook`
        );
      }
    }

    // Mark webhook processed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processingStatus: 'PROCESSED',
        lastProcessedAt: new Date(),
      },
    });
  },
  { connection, concurrency: 10 }
);

/**
 * 2. Recovery Strategy Evaluation Worker (AI Orchestrator + Policy Engine)
 */
export const evaluationWorker = new Worker(
  'recovery-evaluation',
  async (job: Job) => {
    const { caseId, organizationId } = job.data;
    logger.info({ caseId }, 'Evaluating recovery strategy for case');

    const rCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true, payment: true },
    });

    if (!rCase || ['RECOVERED', 'EXHAUSTED', 'CANCELLED'].includes(rCase.status)) {
      return;
    }

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: { status: 'EVALUATING' },
    });

    // 1. Build Bounded Context for AI
    const boundedContext = {
      caseId: rCase.id,
      amountInr: Number(rCase.amountAtRisk),
      currency: rCase.currency,
      failureReason: rCase.reasonCode,
      failureCategory: 'TEMPORARY_NETWORK' as const,
      attemptCount: rCase.attemptCount,
      customerLtvTier: Number(rCase.customer.ltvAmount) > 20000 ? ('VIP' as const) : ('STANDARD' as const),
      hoursSinceFailure: (Date.now() - rCase.createdAt.getTime()) / (3600 * 1000),
      merchantPolicySummary: {
        maxRetries: 3,
        maxDiscountInr: 100,
        canOfferIncentive: true,
      },
    };

    // 2. Call AI Orchestrator with sub-1500ms race
    const aiResult = await aiOrchestrator.evaluateRecoveryStrategy(boundedContext);
    const rec = aiResult.recommendation;

    // Log AI Decision
    await prisma.aiDecisionLog.create({
      data: {
        organizationId,
        recoveryCaseId: caseId,
        promptKey: 'recovery.strategy.v1',
        promptVersion: '1.0.0',
        modelProvider: process.env.AI_PROVIDER || 'mock',
        modelName: 'gemini-1.5-flash',
        inputTokens: aiResult.tokensUsed?.input || 100,
        outputTokens: aiResult.tokensUsed?.output || 40,
        latencyMs: aiResult.latencyMs,
        estimatedCostUsd: 0.00001,
        boundedContext: boundedContext as any,
        rawModelOutput: rec as any,
        parsedDecision: rec as any,
        isFallbackUsed: aiResult.isFallback,
        fallbackReason: aiResult.fallbackReason,
      },
    });

    // 3. Evaluate Policy Engine
    const policyResult = policyEngine.evaluate(
      {
        caseId,
        amountInr: Number(rCase.amountAtRisk),
        reasonCode: rCase.reasonCode,
        attemptCount: rCase.attemptCount,
        lastActionAt: null,
        proposedAction: rec.recommendedAction,
        proposedDiscountInr: rec.parameters.discountInr,
        isSafeMode: process.env.SAFE_MODE_ENABLED === 'true',
      },
      {
        max_retries: 3,
        max_discount_inr: 100,
        cooldown_hours: 6,
        high_value_threshold_inr: 10000,
        allowed_actions: ['SMART_RETRY', 'PAYMENT_LINK', 'CUSTOMER_MESSAGING', 'INCENTIVE_OFFER'],
        restricted_reasons_for_retry: ['CARD_STOLEN', 'ACCOUNT_BLOCKED'],
      }
    );

    // 4. Route based on Policy Decision
    if (policyResult.decision === 'APPROVAL_REQUIRED' || rec.requiresHumanReview) {
      await prisma.approval.create({
        data: {
          recoveryCaseId: caseId,
          requestedBy: 'AI_AGENT',
          requestedAction: rec.recommendedAction,
          actionPayload: rec.parameters as any,
          reasonCode: policyResult.reason,
          status: 'PENDING_REVIEW',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });

      await prisma.recoveryCase.update({
        where: { id: caseId },
        data: { status: 'PENDING_APPROVAL' },
      });
      return;
    }

    if (policyResult.decision === 'BLOCK') {
      await prisma.recoveryCase.update({
        where: { id: caseId },
        data: { status: 'EXHAUSTED' },
      });
      return;
    }

    // 5. Enqueue Action Execution
    await actionQueue.add('execute-action', {
      caseId,
      organizationId,
      actionType: rec.recommendedAction,
      parameters: rec.parameters,
    });

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        status: 'ACTION_SCHEDULED',
        currentStrategy: rec.recommendedAction,
      },
    });
  },
  { connection, concurrency: 5 }
);

/**
 * 3. Recovery Action Execution Worker
 */
export const actionWorker = new Worker(
  'action-execution',
  async (job: Job) => {
    const { caseId, organizationId, actionType, parameters } = job.data;
    logger.info({ caseId, actionType }, 'Executing recovery action');

    const rCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true, organization: true },
    });

    if (!rCase) return;

    const idempotencyKey = `act_${caseId}_${rCase.attemptCount + 1}_${actionType}`;

    // Create Action Ledger Record
    const actionRecord = await prisma.recoveryAction.create({
      data: {
        recoveryCaseId: caseId,
        actionType,
        requestedBy: 'AI_AGENT',
        policyDecision: 'ALLOW',
        executionStatus: 'EXECUTING',
        idempotencyKey,
        actionPayload: parameters || {},
      },
    });

    let executionResult: any = null;

    if (actionType === 'PAYMENT_LINK' || actionType === 'INCENTIVE_OFFER') {
      // Generate Opaque Token for Customer Recovery Web Portal
      const { rawToken, tokenHash } = generateCustomerRecoveryToken();
      const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

      await prisma.customerRecoveryToken.create({
        data: {
          recoveryCaseId: caseId,
          tokenHash,
          expiresAt,
        },
      });

      const recoveryUrl = `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/r/${rawToken}`;

      // Dispatch Customer Notification via Outbox
      await prisma.notificationOutbox.create({
        data: {
          organizationId,
          channel: parameters?.messageChannel || 'EMAIL',
          recipient: rCase.customer.email,
          templateKey: 'customer_payment_recovery',
          payload: {
            variables: {
              customerName: rCase.customer.name,
              amountInr: Number(rCase.amountAtRisk),
              merchantName: rCase.organization.name,
              recoveryUrl,
              discountInr: parameters?.discountInr || 0,
            },
          },
        },
      });

      executionResult = { recoveryUrl, tokenGenerated: true };
    }

    // Update Action and Case
    await prisma.recoveryAction.update({
      where: { id: actionRecord.id },
      data: {
        executionStatus: 'SUCCESS',
        executionResult,
        executedAt: new Date(),
        completedAt: new Date(),
      },
    });

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        status: 'ACTION_EXECUTED',
        attemptCount: { increment: 1 },
      },
    });
  },
  { connection, concurrency: 5 }
);

logger.info('RecoverAI Background Worker Cluster successfully started');
