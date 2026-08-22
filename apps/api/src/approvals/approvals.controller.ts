import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { prisma } from '@recoverai/database';
import { hashSessionToken, isPrivilegedRole } from '@recoverai/auth';
import { ApprovalReviewSchema } from '@recoverai/validation';
import { AuditService } from '@recoverai/audit';
import { Queue } from 'bullmq';

@Controller('approvals')
export class ApprovalsController {
  private executionQueue: Queue;

  constructor() {
    this.executionQueue = new Queue('action-execution', {
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

  @Get('pending')
  public async getPendingApprovals(@Req() req: Request) {
    const user = await this.authenticateSession(req);

    return prisma.approval.findMany({
      where: {
        status: 'PENDING_REVIEW',
        recoveryCase: {
          organizationId: user.organizationId,
        },
      },
      include: {
        recoveryCase: {
          include: {
            customer: true,
            payment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post(':id/review')
  public async reviewApproval(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const user = await this.authenticateSession(req);
    const validated = ApprovalReviewSchema.parse(body);

    if (!isPrivilegedRole(user.role)) {
      throw new HttpException(
        'Insufficient permissions: only ADMIN or OWNER can approve actions',
        HttpStatus.FORBIDDEN
      );
    }

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: { recoveryCase: true },
    });

    if (!approval || approval.recoveryCase.organizationId !== user.organizationId) {
      throw new HttpException('Approval record not found', HttpStatus.NOT_FOUND);
    }

    if (approval.status !== 'PENDING_REVIEW') {
      throw new HttpException('Approval is already resolved', HttpStatus.CONFLICT);
    }

    // Maker-Checker Invariant check
    if (approval.requestedBy === 'USER' && approval.reviewedById === user.id) {
      throw new HttpException(
        'Maker-Checker Violation: Approver cannot be the same user who requested the action',
        HttpStatus.FORBIDDEN
      );
    }

    const newStatus = validated.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updatedApproval = await prisma.approval.update({
      where: { id },
      data: {
        status: newStatus as any,
        reviewedById: user.id,
        reviewNotes: validated.reviewNotes,
        reviewedAt: new Date(),
      },
    });

    if (newStatus === 'APPROVED') {
      // Enqueue action execution
      await this.executionQueue.add('execute-approved-action', {
        caseId: approval.recoveryCaseId,
        actionType: approval.requestedAction,
        actionPayload: approval.actionPayload,
        approvedBy: user.id,
      });

      await prisma.recoveryCase.update({
        where: { id: approval.recoveryCaseId },
        data: { status: 'ACTION_SCHEDULED' },
      });
    } else {
      await prisma.recoveryCase.update({
        where: { id: approval.recoveryCaseId },
        data: { status: 'EXHAUSTED' },
      });
    }

    await AuditService.record({
      organizationId: user.organizationId,
      actorType: 'USER',
      actorId: user.id,
      action: `approval.${validated.action.toLowerCase()}`,
      resourceType: 'approval',
      resourceId: id,
      metadata: { reviewNotes: validated.reviewNotes },
    });

    return updatedApproval;
  }
}
