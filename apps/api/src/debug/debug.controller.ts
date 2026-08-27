import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { prisma } from '@recoverai/database';

@Controller('debug')
export class DebugController {
  @Get('data-consistency')
  public async getDataConsistency(@Req() req: Request) {
    const defaultOrg = await prisma.organization.findFirst({
      where: { slug: 'acme-stores' },
    });

    if (!defaultOrg) {
      return {
        error: 'No organization found',
        databaseStatus: 'EMPTY',
      };
    }

    const organizationId = defaultOrg.id;

    // 1. Total Cases
    const recoveryCaseCount = await prisma.recoveryCase.count({
      where: { organizationId },
    });

    // 2. Status Breakdown
    const cases = await prisma.recoveryCase.findMany({
      where: { organizationId },
      select: { status: true, createdAt: true, amountAtRisk: true },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts: Record<string, number> = {};
    for (const c of cases) {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    }

    // 3. Pending Approvals Count
    const pendingApprovalCount = await prisma.approval.count({
      where: {
        status: 'PENDING_REVIEW',
        recoveryCase: { organizationId },
      },
    });

    // 4. Latest Audit Event (Simulation ID if available)
    const latestAudit = await prisma.auditEvent.findFirst({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
      select: { action: true, traceId: true, timestamp: true, metadata: true },
    });

    // 5. Database connection target (sanitized, no credentials)
    const dbUrl = process.env.DATABASE_URL || '';
    const sanitizedDb = dbUrl.replace(/\/\/[^@]+@/, '//***:***@');

    return {
      organizationId,
      organizationSlug: defaultOrg.slug,
      databaseTarget: sanitizedDb.split('@')[1] || 'localhost:5432/recoverai',
      recoveryCaseCount,
      statusCounts,
      pendingApprovalCount,
      latestCaseCreatedAt: cases[0]?.createdAt || null,
      latestAuditEvent: latestAudit ? {
        action: latestAudit.action,
        traceId: latestAudit.traceId,
        timestamp: latestAudit.timestamp,
      } : null,
      timestamp: new Date().toISOString(),
    };
  }
}
