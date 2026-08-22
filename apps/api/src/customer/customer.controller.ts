import {
  Controller,
  Get,
  Post,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { prisma } from '@recoverai/database';
import { hashToken } from '@recoverai/security';
import { RazorpayAdapter } from '@recoverai/payments';
import { AuditService } from '@recoverai/audit';

@Controller('public/recovery')
export class CustomerRecoveryController {
  @Get('tokens/:rawToken')
  public async getRecoveryDetails(@Param('rawToken') rawToken: string) {
    const tokenHash = hashToken(rawToken);

    const recoveryToken = await prisma.customerRecoveryToken.findUnique({
      where: { tokenHash },
      include: {
        recoveryCase: {
          include: {
            customer: true,
            organization: true,
            payment: true,
          },
        },
      },
    });

    if (!recoveryToken || recoveryToken.isRevoked || recoveryToken.expiresAt < new Date()) {
      throw new HttpException('Recovery link has expired or is invalid', HttpStatus.NOT_FOUND);
    }

    if (recoveryToken.isUsed) {
      throw new HttpException('Payment for this order has already been completed', HttpStatus.GONE);
    }

    // Increment access count
    await prisma.customerRecoveryToken.update({
      where: { id: recoveryToken.id },
      data: {
        accessedCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    const rCase = recoveryToken.recoveryCase;

    return {
      caseId: rCase.id,
      merchantName: rCase.organization.name,
      customerName: rCase.customer.name,
      amountInr: Number(rCase.amountAtRisk),
      currency: rCase.currency,
      expiresAt: recoveryToken.expiresAt,
      razorpayKeyId: rCase.organization.razorpayKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
    };
  }

  @Post('tokens/:rawToken/create-order')
  public async createRecoveryOrder(
    @Param('rawToken') rawToken: string
  ) {
    const tokenHash = hashToken(rawToken);

    const recoveryToken = await prisma.customerRecoveryToken.findUnique({
      where: { tokenHash },
      include: {
        recoveryCase: {
          include: {
            customer: true,
            organization: true,
          },
        },
      },
    });

    if (!recoveryToken || recoveryToken.isRevoked || recoveryToken.expiresAt < new Date()) {
      throw new HttpException('Recovery link is no longer active', HttpStatus.GONE);
    }

    const rCase = recoveryToken.recoveryCase;
    const adapter = new RazorpayAdapter({
      keyId: rCase.organization.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    const order = await adapter.createOrder({
      amountInr: Number(rCase.amountAtRisk),
      currency: rCase.currency,
      receipt: `rec_${rCase.id.substring(0, 8)}`,
      notes: {
        recovery_case_id: rCase.id,
        customer_id: rCase.customerId,
      },
    });

    await AuditService.record({
      organizationId: rCase.organizationId,
      actorType: 'SYSTEM',
      action: 'customer.recovery_order_initiated',
      resourceType: 'order',
      resourceId: order.id,
      metadata: { recoveryCaseId: rCase.id },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: rCase.organization.razorpayKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
    };
  }
}
