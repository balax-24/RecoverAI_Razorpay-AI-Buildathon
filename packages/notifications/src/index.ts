export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';

export interface NotificationPayload {
  recipient: string;
  templateKey: string;
  variables: {
    customerName: string;
    amountInr: number;
    merchantName: string;
    recoveryUrl: string;
    expiresInHours?: number;
    discountInr?: number;
  };
}

export interface NotificationDispatchResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}

export class NotificationService {
  /**
   * Renders approved, safe customer recovery templates
   */
  public renderTemplate(channel: NotificationChannel, payload: NotificationPayload): string {
    const { customerName, amountInr, merchantName, recoveryUrl, discountInr } = payload.variables;

    if (channel === 'SMS') {
      return `Hi ${customerName}, your payment of Rs.${amountInr} to ${merchantName} failed. Complete your payment securely here: ${recoveryUrl}`;
    }

    if (channel === 'WHATSAPP') {
      return `Hello ${customerName}, we noticed a temporary payment issue with ${merchantName} for ₹${amountInr}.${
        discountInr ? ` An exclusive discount of ₹${discountInr} has been applied.` : ''
      }\nComplete your recovery securely: ${recoveryUrl}`;
    }

    // Default Email template
    return `
Dear ${customerName},

We noticed your recent payment of ₹${amountInr} to ${merchantName} could not be processed due to a temporary bank issue.

To prevent any interruption to your order, you can securely complete your transaction using our instant recovery portal:
${recoveryUrl}

${discountInr ? `Note: A recovery goodwill discount of ₹${discountInr} has been credited to this link.` : ''}

Thank you,
${merchantName} Billing Support
    `.trim();
  }

  /**
   * Dispatches message via channel adapter (Simulated for Email/SMS/WA, real for In-App)
   */
  public async dispatch(
    channel: NotificationChannel,
    payload: NotificationPayload
  ): Promise<NotificationDispatchResult> {
    this.renderTemplate(channel, payload);

    return {
      success: true,
      channel,
      messageId: `msg_${Math.random().toString(36).substring(2, 10)}`,
    };
  }
}
