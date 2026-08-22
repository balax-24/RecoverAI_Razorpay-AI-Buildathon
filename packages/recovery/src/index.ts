import { prisma } from '@recoverai/database';
import {
  canTransitionRecovery,
  DomainInvariantViolation,
  RecoveryStatus,
} from '@recoverai/domain';
import { AuditService } from '@recoverai/audit';

export interface CreateRecoveryCaseParams {
  organizationId: string;
  customerId: string;
  paymentId: string;
  amountAtRisk: number;
  currency?: string;
  reasonCode: string;
  traceId?: string;
}

export class RecoveryEngine {
  /**
   * Creates a new RecoveryCase from a failed payment event
   */
  public async createCase(params: CreateRecoveryCaseParams) {
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000); // 72h default

    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        organizationId: params.organizationId,
        customerId: params.customerId,
        paymentId: params.paymentId,
        amountAtRisk: params.amountAtRisk,
        currency: params.currency || 'INR',
        reasonCode: params.reasonCode,
        priorityScore: params.amountAtRisk > 10000 ? 90 : 50,
        status: 'PENDING',
        expiresAt,
        traceId: params.traceId,
      },
    });

    await AuditService.record({
      organizationId: params.organizationId,
      actorType: 'SYSTEM',
      action: 'recovery.case_created',
      resourceType: 'recovery_case',
      resourceId: recoveryCase.id,
      reasonCode: params.reasonCode,
      traceId: params.traceId,
      newState: recoveryCase,
    });

    return recoveryCase;
  }

  /**
   * Safely transitions a recovery case to a target status with state machine verification
   */
  public async transitionStatus(
    caseId: string,
    targetStatus: RecoveryStatus,
    reason: string,
    actorId?: string
  ) {
    const currentCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
    });

    if (!currentCase) {
      throw new Error(`Recovery case ${caseId} not found`);
    }

    if (!canTransitionRecovery(currentCase.status as RecoveryStatus, targetStatus)) {
      throw new DomainInvariantViolation(
        'INVALID_STATE_TRANSITION',
        `Cannot transition recovery case from ${currentCase.status} to ${targetStatus}`
      );
    }

    const updated = await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        status: targetStatus as any,
        resolvedAt: targetStatus === 'RECOVERED' ? new Date() : undefined,
      },
    });

    await AuditService.record({
      organizationId: currentCase.organizationId,
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId,
      action: 'recovery.status_transitioned',
      resourceType: 'recovery_case',
      resourceId: caseId,
      reasonCode: reason,
      previousState: { status: currentCase.status },
      newState: { status: targetStatus },
    });

    return updated;
  }
}
