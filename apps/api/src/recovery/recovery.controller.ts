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

@Controller('recovery/cases')
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
    const rawToken = req.cookies?.['recoverai_session'];
    if (!rawToken) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const tokenHash = hashSessionToken(rawToken);
    const session = await prisma.session.findUnique({
      where: { sessionToken: tokenHash },
      include: { user: true },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new HttpException('Session expired', HttpStatus.UNAUTHORIZED);
    }

    return session.user;
  }

  @Get()
  public async listCases(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ) {
    const user = await this.authenticateSession(req);
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const whereClause: any = {
      organizationId: user.organizationId,
    };

    if (status) {
      whereClause.status = status;
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
        },
        orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
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
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get(':id')
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
        },
      },
    });

    if (!recoveryCase) {
      throw new HttpException('Recovery case not found', HttpStatus.NOT_FOUND);
    }

    return recoveryCase;
  }

  @Post(':id/retry')
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
