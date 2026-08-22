import * as crypto from 'crypto';
import Razorpay from 'razorpay';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

export interface CreateOrderParams {
  amountInr: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreatePaymentLinkParams {
  amountInr: number;
  currency?: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact?: string;
  };
  expireByHours?: number;
  referenceId?: string;
}

export class RazorpayAdapter {
  private client: Razorpay | null = null;

  constructor(private readonly config: RazorpayConfig) {
    if (config.keyId && config.keySecret) {
      this.client = new Razorpay({
        key_id: config.keyId,
        key_secret: config.keySecret,
      });
    }
  }

  /**
   * Cryptographically verifies Razorpay Webhook Signature against the Raw Body Buffer
   */
  public verifyWebhookSignature(
    rawBodyBuffer: Buffer,
    signature: string,
    secret?: string
  ): boolean {
    const webhookSecret = secret || this.config.webhookSecret;
    if (!webhookSecret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyBuffer)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Creates a new Razorpay Order in paise
   */
  public async createOrder(params: CreateOrderParams) {
    if (!this.client) {
      // Mock order creation for testing if keys are missing
      return {
        id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
        amount: Math.round(params.amountInr * 100),
        currency: params.currency || 'INR',
        receipt: params.receipt,
        status: 'created',
      };
    }

    return (this.client.orders.create as any)({
      amount: Math.round(params.amountInr * 100), // convert to paise
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes,
    });
  }

  /**
   * Generates a hosted Razorpay Payment Link
   */
  public async createPaymentLink(params: CreatePaymentLinkParams) {
    if (!this.client) {
      const mockId = `plink_mock_${crypto.randomBytes(8).toString('hex')}`;
      return {
        id: mockId,
        short_url: `https://rzp.io/i/${mockId}`,
        status: 'created',
        amount: Math.round(params.amountInr * 100),
      };
    }

    const expireBy = Math.floor(Date.now() / 1000) + (params.expireByHours || 48) * 3600;

    return (this.client.paymentLink.create as any)({
      amount: Math.round(params.amountInr * 100),
      currency: params.currency || 'INR',
      description: params.description,
      customer: params.customer,
      reference_id: params.referenceId,
      expire_by: expireBy,
    });
  }

  /**
   * Fetches payment details by Razorpay Payment ID
   */
  public async fetchPayment(paymentId: string) {
    if (!this.client) {
      return {
        id: paymentId,
        entity: 'payment',
        amount: 50000,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
      };
    }

    return this.client.payments.fetch(paymentId);
  }
}
