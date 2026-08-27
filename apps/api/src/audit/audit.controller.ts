import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { prisma } from '@recoverai/database';

@Controller('audit')
export class AuditController {
  @Get()
  public async getAuditEvents(
    @Req() req: Request,
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '25'
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const defaultOrg = await prisma.organization.findFirst({
      where: { slug: 'acme-stores' },
    });

    const whereClause: any = {};
    if (defaultOrg) {
      whereClause.organizationId = defaultOrg.id;
    }

    if (actor && actor !== 'ALL') {
      whereClause.actorType = actor;
    }

    if (action && action !== 'ALL') {
      whereClause.action = { contains: action, mode: 'insensitive' };
    }

    if (resource && resource !== 'ALL') {
      whereClause.resourceType = resource;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { resourceId: { contains: q, mode: 'insensitive' } },
        { traceId: { contains: q, mode: 'insensitive' } },
        { reasonCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.auditEvent.count({ where: whereClause }),
    ]);

    return {
      data: events,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}
