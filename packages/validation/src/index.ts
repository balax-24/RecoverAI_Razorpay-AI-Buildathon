import { z } from 'zod';

// -------------------------------------------------------------
// Auth & Identity Schemas
// -------------------------------------------------------------

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const VerifyMfaSchema = z.object({
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d+$/, 'Digits only'),
});

export type VerifyMfaDto = z.infer<typeof VerifyMfaSchema>;

// -------------------------------------------------------------
// Razorpay Webhook Ingestion Schema
// -------------------------------------------------------------

export const RazorpayWebhookPayloadSchema = z.object({
  entity: z.string().default('event'),
  account_id: z.string().optional(),
  event: z.string(),
  contains: z.array(z.string()).optional(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        entity: z.literal('payment'),
        amount: z.number().int().positive(),
        currency: z.string().default('INR'),
        status: z.string(),
        order_id: z.string().nullable().optional(),
        method: z.string().optional(),
        email: z.string().optional(),
        contact: z.string().optional(),
        error_code: z.string().nullable().optional(),
        error_description: z.string().nullable().optional(),
        error_source: z.string().nullable().optional(),
        error_step: z.string().nullable().optional(),
        error_reason: z.string().nullable().optional(),
        created_at: z.number().optional(),
      }),
    }).optional(),
    order: z.object({
      entity: z.object({
        id: z.string(),
        amount: z.number().int().positive(),
        currency: z.string().default('INR'),
        status: z.string(),
      }),
    }).optional(),
  }),
  created_at: z.number().optional(),
});

export type RazorpayWebhookPayload = z.infer<typeof RazorpayWebhookPayloadSchema>;

// -------------------------------------------------------------
// AI Decision Engine Schemas
// -------------------------------------------------------------

export const AiRecommendationSchema = z.object({
  recommendedAction: z.enum([
    'SMART_RETRY',
    'PAYMENT_LINK',
    'CUSTOMER_MESSAGING',
    'INCENTIVE_OFFER',
    'MANUAL_INTERVENTION',
  ]),
  confidenceScore: z.number().min(0.0).max(1.0),
  reasoningSummary: z.string().max(255),
  parameters: z.object({
    delayHours: z.number().min(0).max(48).default(0),
    discountInr: z.number().min(0).max(500).default(0),
    messageChannel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']).optional(),
    messageTemplateKey: z.string().optional(),
  }),
  requiresHumanReview: z.boolean().default(false),
});

export type AiRecommendation = z.infer<typeof AiRecommendationSchema>;

// -------------------------------------------------------------
// Policy Engine DSL Schema
// -------------------------------------------------------------

export const PolicyRulesDslSchema = z.object({
  max_retries: z.number().int().min(1).max(5).default(3),
  max_discount_inr: z.number().min(0).max(500).default(100),
  cooldown_hours: z.number().int().min(1).max(72).default(6),
  high_value_threshold_inr: z.number().min(1000).default(10000),
  allowed_actions: z
    .array(
      z.enum([
        'SMART_RETRY',
        'PAYMENT_LINK',
        'CUSTOMER_MESSAGING',
        'INCENTIVE_OFFER',
        'MANUAL_INTERVENTION',
      ])
    )
    .default(['SMART_RETRY', 'PAYMENT_LINK', 'CUSTOMER_MESSAGING', 'INCENTIVE_OFFER']),
  restricted_reasons_for_retry: z
    .array(z.string())
    .default(['CARD_STOLEN', 'ACCOUNT_BLOCKED', 'FRAUD_SUSPECTED']),
});

export type PolicyRulesDsl = z.infer<typeof PolicyRulesDslSchema>;

// -------------------------------------------------------------
// Approval Review Schema
// -------------------------------------------------------------

export const ApprovalReviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reviewNotes: z.string().max(500).optional(),
});

export type ApprovalReviewDto = z.infer<typeof ApprovalReviewSchema>;

// -------------------------------------------------------------
// Customer Recovery Public API Schema
// -------------------------------------------------------------

export const CustomerPaymentInitiateSchema = z.object({
  preferredMethod: z.enum(['upi', 'card', 'netbanking']).optional(),
});

export type CustomerPaymentInitiateDto = z.infer<typeof CustomerPaymentInitiateSchema>;
