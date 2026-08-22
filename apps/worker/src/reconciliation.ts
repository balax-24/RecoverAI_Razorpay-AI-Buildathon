import { prisma } from '@recoverai/database';
import { RazorpayAdapter } from '@recoverai/payments';
import { RecoveryEngine } from '@recoverai/recovery';
import { logger } from '@recoverai/observability';

const recoveryEngine = new RecoveryEngine();

export class ReconciliationEngine {
  /**
   * Executes reconciliation cycle comparing local DB payment statuses against Razorpay API
   */
  public static async runReconciliationCycle() {
    logger.info('Starting automated 30-minute payment reconciliation cycle...');

    // Find all unresolved payments created in the last 72 hours
    const cutoffDate = new Date(Date.now() - 72 * 3600 * 1000);
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: { in: ['CREATED', 'AUTHORIZED', 'FAILED'] },
        createdAt: { gte: cutoffDate },
      },
      include: {
        organization: true,
        recoveryCases: {
          where: { status: { in: ['PENDING', 'ACTION_SCHEDULED', 'IN_GRACE_PERIOD'] } },
        },
      },
      take: 100,
    });

    logger.info({ count: pendingPayments.length }, 'Found pending payments to reconcile');

    for (const payment of pendingPayments) {
      try {
        const adapter = new RazorpayAdapter({
          keyId: payment.organization.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '',
          keySecret: process.env.RAZORPAY_KEY_SECRET || '',
        });

        const gatewayPayment = await adapter.fetchPayment(payment.razorpayPaymentId);
        const gatewayStatus = (gatewayPayment.status.toUpperCase() as any) || 'FAILED';

        if (payment.status !== gatewayStatus) {
          logger.warn(
            {
              paymentId: payment.id,
              dbStatus: payment.status,
              gatewayStatus,
            },
            'Payment status mismatch detected during reconciliation'
          );

          // Update local DB status to match Gateway authority
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: gatewayStatus },
          });

          // Log discrepancy in reconciliation ledger
          await prisma.reconciliationLog.create({
            data: {
              organizationId: payment.organizationId,
              paymentId: payment.razorpayPaymentId,
              dbStatus: payment.status as any,
              gatewayStatus: gatewayStatus as any,
              status: 'RECONCILED_AUTOMATICALLY',
              actionTaken: `Updated local status from ${payment.status} to ${gatewayStatus}`,
              discrepancyDetails: { gatewayPayment: gatewayPayment as any },
            },
          });

          // If captured on gateway, resolve associated recovery cases
          if (gatewayStatus === 'CAPTURED') {
            for (const rCase of payment.recoveryCases) {
              await recoveryEngine.transitionStatus(
                rCase.id,
                'RECOVERED',
                `Reconciled via Razorpay API: Payment captured on gateway`
              );
            }
          }
        } else {
          // Log matched reconciliation
          await prisma.reconciliationLog.create({
            data: {
              organizationId: payment.organizationId,
              paymentId: payment.razorpayPaymentId,
              dbStatus: payment.status as any,
              gatewayStatus: gatewayStatus as any,
              status: 'MATCHED',
            },
          });
        }
      } catch (err: any) {
        logger.error(err, `Error reconciling payment ${payment.razorpayPaymentId}`);
      }
    }

    logger.info('Payment reconciliation cycle completed successfully');
  }
}
