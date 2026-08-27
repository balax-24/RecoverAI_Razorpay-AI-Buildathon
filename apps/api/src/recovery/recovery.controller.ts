import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { prisma } from '@recoverai/database';
import { hashSessionToken } from '@recoverai/auth';
import { Queue } from 'bullmq';

@Controller('recovery')
export class RecoveryController {
  private recoveryQueue: Queue;

  constructor() {
    this.recoveryQueue = new Queue('recovery-evaluation', {
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    });
  }

  private async authenticateSession(req: Request) {
    const rawToken =
      req.cookies?.['recoverai_session'] ||
      req.headers.authorization?.replace('Bearer ', '');

    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      const session = await prisma.session.findUnique({
        where: { sessionToken: tokenHash },
        include: { user: true },
      });

      if (session && !session.isRevoked && session.expiresAt >= new Date()) {
        return session.user;
      }
    }

    // Check for demo mode / demo header or fallback to default merchant organization
    const isDemoMode = req.headers['x-demo-mode'] === 'true' || process.env.NODE_ENV !== 'production';
    if (isDemoMode) {
      const defaultOrg = await prisma.organization.findFirst({
        where: { slug: 'acme-stores' },
        include: { users: true },
      });

      if (defaultOrg) {
        return (
          defaultOrg.users[0] || {
            id: '00000000-0000-0000-0000-000000000001',
            organizationId: defaultOrg.id,
            email: 'admin@acmestores.com',
            fullName: 'Vikram Merchant',
            role: 'ADMIN',
          }
        );
      }
    }

    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  /**
   * GET /recovery/cases
   * Paginated, searchable, and filterable recovery cases
   */
  @Get('cases')
  public async listCases(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('reasonCode') reasonCode?: string,
    @Query('strategy') strategy?: string,
    @Query('policyDecision') policyDecision?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortOrder') sortOrder = 'desc'
  ) {
    const user = await this.authenticateSession(req);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    // Accept both `limit` (dashboard) and `pageSize` (curl/docs) aliases
    const rawLimit = limit || pageSize || '25';
    const limitNum = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 25));

    const whereClause: any = {
      organizationId: user.organizationId,
    };

    // Support single status or comma-separated pipeline stage groups
    // e.g. ACTION_SCHEDULED,ACTION_EXECUTED,IN_GRACE_PERIOD
    if (status && status !== 'ALL') {
      const statuses = status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        whereClause.status = statuses[0];
      } else if (statuses.length > 1) {
        whereClause.status = { in: statuses };
      }
    }

    if (reasonCode && reasonCode !== 'ALL') {
      whereClause.reasonCode = {
        contains: reasonCode,
        mode: 'insensitive',
      };
    }

    if (strategy && strategy !== 'ALL') {
      whereClause.currentStrategy = strategy;
    }

    if (search && search.trim()) {
      const query = search.trim();
      whereClause.OR = [
        { customer: { name: { contains: query, mode: 'insensitive' } } },
        { customer: { email: { contains: query, mode: 'insensitive' } } },
        { payment: { razorpayPaymentId: { contains: query, mode: 'insensitive' } } },
        { reasonCode: { contains: query, mode: 'insensitive' } },
        { traceId: { contains: query, mode: 'insensitive' } },
        { id: { contains: query, mode: 'insensitive' } },
      ];
    }

    const orderByClause: any = {};
    if (sortBy === 'amountAtRisk') {
      orderByClause.amountAtRisk = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    } else if (sortBy === 'priorityScore') {
      orderByClause.priorityScore = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    } else {
      orderByClause.createdAt = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    }

    const [cases, total] = await Promise.all([
      prisma.recoveryCase.findMany({
        where: whereClause,
        include: {
          customer: true,
          payment: true,
          actions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          approvals: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [orderByClause, { id: 'desc' }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.recoveryCase.count({ where: whereClause }),
    ]);

    return {
      data: cases,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * GET /recovery/metrics
   * Aggregate operational summary & pipeline stage counts
   */
  @Get('metrics')
  public async getMetrics(@Req() req: Request) {
    const user = await this.authenticateSession(req);

    const [
      totalCases,
      recoveredCases,
      activeCases,
      pendingApprovals,
      exhaustedCases,
      allCasesForAmounts,
      stageCounts,
    ] = await Promise.all([
      prisma.recoveryCase.count({ where: { organizationId: user.organizationId } }),
      prisma.recoveryCase.count({
        where: { organizationId: user.organizationId, status: 'RECOVERED' },
      }),
      prisma.recoveryCase.count({
        where: {
          organizationId: user.organizationId,
          status: {
            in: [
              'PENDING',
              'EVALUATING',
              'ACTION_SCHEDULED',
              'ACTION_EXECUTED',
              'IN_GRACE_PERIOD',
              'PENDING_APPROVAL',
            ],
          },
        },
      }),
      prisma.approval.count({
        where: {
          status: 'PENDING_REVIEW',
          recoveryCase: { organizationId: user.organizationId },
        },
      }),
      prisma.recoveryCase.count({
        where: {
          organizationId: user.organizationId,
          status: { in: ['EXHAUSTED', 'BLOCKED', 'CANCELLED'] },
        },
      }),
      prisma.recoveryCase.findMany({
        where: { organizationId: user.organizationId },
        select: { amountAtRisk: true, status: true },
      }),
      prisma.recoveryCase.groupBy({
        by: ['status'],
        where: { organizationId: user.organizationId },
        _count: { _all: true },
      }),
    ]);

    let totalRevenueAtRisk = 0;
    let totalRevenueRecovered = 0;

    for (const c of allCasesForAmounts) {
      const amt = Number(c.amountAtRisk) || 0;
      totalRevenueAtRisk += amt;
      if (c.status === 'RECOVERED') {
        totalRevenueRecovered += amt;
      }
    }

    const stageMap: Record<string, number> = {};
    stageCounts.forEach((s) => {
      stageMap[s.status] = s._count._all;
    });

    const pipeline = {
      failed: (stageMap['PENDING'] || 0),
      analyzing: (stageMap['EVALUATING'] || 0),
      policyCheck: (stageMap['PENDING_APPROVAL'] || 0),
      actionRunning:
        (stageMap['ACTION_SCHEDULED'] || 0) +
        (stageMap['ACTION_EXECUTED'] || 0) +
        (stageMap['IN_GRACE_PERIOD'] || 0),
      recovered: stageMap['RECOVERED'] || 0,
      escalated: (stageMap['EXHAUSTED'] || 0) + (stageMap['BLOCKED'] || 0) + (stageMap['CANCELLED'] || 0),
    };

    const recoveryRate =
      totalCases > 0 ? Number(((recoveredCases / totalCases) * 100).toFixed(1)) : 0;

    return {
      revenueAtRisk: totalRevenueAtRisk,
      revenueRecovered: totalRevenueRecovered,
      activeCases,
      recoveryRate,
      pendingApprovals,
      failedJobs: exhaustedCases,
      totalCases,
      pipeline,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /recovery/cases/:id
   * Complete recovery case details with AI decisions, policy results, action execution, and audit timeline
   */
  @Get('cases/:id')
  public async getCaseDetails(@Req() req: Request, @Param('id') id: string) {
    const user = await this.authenticateSession(req);

    const recoveryCase = await prisma.recoveryCase.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        customer: true,
        payment: true,
        actions: {
          orderBy: { createdAt: 'desc' },
        },
        approvals: {
          include: { reviewedBy: true },
          orderBy: { createdAt: 'desc' },
        },
        recoveryTokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!recoveryCase) {
      throw new HttpException('Recovery case not found', HttpStatus.NOT_FOUND);
    }

    // Fetch associated AI decision logs and audit trail
    const [aiLogs, auditEvents] = await Promise.all([
      prisma.aiDecisionLog.findMany({
        where: {
          recoveryCaseId: id,
          organizationId: user.organizationId,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditEvent.findMany({
        where: {
          resourceId: id,
          organizationId: user.organizationId,
        },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    const latestAiDecision = aiLogs[0] || null;

    return {
      ...recoveryCase,
      aiDecisionLog: latestAiDecision,
      aiLogs,
      auditEvents,
    };
  }

  @Post('cases/:id/retry')
  public async triggerManualEvaluation(
    @Req() req: Request,
    @Param('id') id: string
  ) {
    const user = await this.authenticateSession(req);

    const recoveryCase = await prisma.recoveryCase.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!recoveryCase) {
      throw new HttpException('Case not found', HttpStatus.NOT_FOUND);
    }

    await this.recoveryQueue.add('evaluate-case', {
      caseId: recoveryCase.id,
      organizationId: recoveryCase.organizationId,
      triggeredBy: user.id,
    });

    return { status: 'evaluation_scheduled', caseId: id };
  }
}
