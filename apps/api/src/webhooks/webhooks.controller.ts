import {
  Controller,
  Post,
  Req,
  Headers,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { prisma } from '@recoverai/database';
import { RazorpayAdapter } from '@recoverai/payments';
import { logger } from '@recoverai/observability';
import { Queue } from 'bullmq';

@Controller('webhooks')
export class WebhooksController {
  private webhookQueue: Queue;

  constructor() {
    this.webhookQueue = new Queue('webhook-processing', {
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    });
  }

  @Post('razorpay')
  @HttpCode(200)
  public async handleRazorpayWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature?: string,
    @Headers('x-razorpay-event-id') providerEventIdHeader?: string
  ) {
    const rawBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body), 'utf8');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';

    // 1. Verify HMAC Signature
    const adapter = new RazorpayAdapter({
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: secret,
    });

    const isValid = signature
      ? adapter.verifyWebhookSignature(rawBuffer, signature, secret)
      : false;

    if (!isValid && process.env.NODE_ENV === 'production') {
      logger.warn({ signature }, 'Invalid Razorpay webhook signature rejected');
      throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
    }

    const payload = req.body;
    const eventType = payload.event || 'unknown';
    const providerEventId =
      providerEventIdHeader ||
      payload.payload?.payment?.entity?.id ||
      `evt_${crypto.randomBytes(8).toString('hex')}`;

    const payloadHash = crypto
      .createHash('sha256')
      .update(rawBuffer)
      .digest('hex');

    try {
      // 2. Persist to Webhook Event Ledger (Idempotency deduplication)
      const existing = await prisma.webhookEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: 'razorpay',
            providerEventId,
          },
        },
      });

      if (existing) {
        logger.info({ providerEventId }, 'Duplicate webhook event received; responding 200 OK');
        return { status: 'duplicate_acknowledged' };
      }

      const eventRecord = await prisma.webhookEvent.create({
        data: {
          provider: 'razorpay',
          providerEventId,
          eventType,
          signatureValid: isValid || true,
          payloadHash,
          rawPayload: payload,
          processingStatus: 'RECEIVED',
        },
      });

      // 3. Enqueue for asynchronous worker processing
      await this.webhookQueue.add(
        'process-webhook',
        {
          webhookEventId: eventRecord.id,
          eventType,
          payload,
        },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        }
      );

      // 4. Return fast 200 OK
      return { status: 'acknowledged', eventId: eventRecord.id };
    } catch (err: any) {
      logger.error(err, 'Failed to persist and enqueue webhook');
      // If uniqueness violation happens in race condition, acknowledge
      if (err.code === 'P2002') {
        return { status: 'duplicate_acknowledged' };
      }
      throw new HttpException('Webhook ingestion error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
