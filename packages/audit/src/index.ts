import { prisma } from '@recoverai/database';
import { ActorType } from '@recoverai/domain';

export interface RecordAuditParams {
  organizationId: string;
  actorType: ActorType;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  reasonCode?: string;
  policyId?: string;
  requestId?: string;
  traceId?: string;
  ipAddress?: string;
  previousState?: any;
  newState?: any;
  metadata?: any;
}

export class AuditService {
  /**
   * Appends an immutable audit event to the ledger
   */
  public static async record(params: RecordAuditParams) {
    try {
      return await prisma.auditEvent.create({
        data: {
          organizationId: params.organizationId,
          actorType: params.actorType as any,
          actorId: params.actorId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          reasonCode: params.reasonCode,
          policyId: params.policyId,
          requestId: params.requestId,
          traceId: params.traceId,
          ipAddress: params.ipAddress,
          previousState: params.previousState,
          newState: params.newState,
          metadata: params.metadata,
        },
      });
    } catch (err) {
      console.error('[AuditService] Failed to record audit event:', err);
      // We don't crash business operations if audit logging encounters a non-critical error,
      // but in production this raises an OTEL alarm.
      return null;
    }
  }
}
