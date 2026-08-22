import { FailureCategory } from '@recoverai/domain';
import { AiRecommendation, AiRecommendationSchema } from '@recoverai/validation';

export interface BoundedRecoveryContext {
  caseId: string;
  amountInr: number;
  currency: string;
  failureReason: string;
  failureCategory: FailureCategory;
  attemptCount: number;
  customerLtvTier: 'STANDARD' | 'VALUED' | 'VIP';
  hoursSinceFailure: number;
  merchantPolicySummary: {
    maxRetries: number;
    maxDiscountInr: number;
    canOfferIncentive: boolean;
  };
  sanitizedCustomerNote?: string;
}

export interface AiOrchestratorConfig {
  provider: 'gemini' | 'openai' | 'mock';
  apiKey?: string;
  modelName?: string;
  timeoutBudgetMs?: number;
}

export class RecoveryOrchestrator {
  private readonly timeoutMs: number;

  constructor(private readonly config: AiOrchestratorConfig) {
    this.timeoutMs = config.timeoutBudgetMs || 1500;
  }

  /**
   * Evaluates recovery context and returns structured recommendation with strict fallback
   */
  public async evaluateRecoveryStrategy(
    context: BoundedRecoveryContext
  ): Promise<{
    recommendation: AiRecommendation;
    isFallback: boolean;
    fallbackReason?: string;
    latencyMs: number;
    tokensUsed?: { input: number; output: number };
  }> {
    const startTime = Date.now();

    // If mock provider or no API key, use deterministic fallback
    if (this.config.provider === 'mock' || !this.config.apiKey) {
      const fallbackRec = this.executeDeterministicFallback(context);
      return {
        recommendation: fallbackRec,
        isFallback: true,
        fallbackReason: 'MOCK_PROVIDER_ACTIVE',
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      // Execute with timeout race
      const result = await Promise.race([
        this.callLlm(context),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT_EXCEEDED')), this.timeoutMs)
        ),
      ]);

      const latencyMs = Date.now() - startTime;
      return {
        recommendation: result.recommendation,
        isFallback: false,
        latencyMs,
        tokensUsed: result.tokensUsed,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const fallbackRec = this.executeDeterministicFallback(context);
      return {
        recommendation: fallbackRec,
        isFallback: true,
        fallbackReason: err?.message || 'UNKNOWN_AI_FAILURE',
        latencyMs,
      };
    }
  }

  /**
   * Deterministic Fallback Engine (Sub-5ms guarantee)
   */
  public executeDeterministicFallback(
    context: BoundedRecoveryContext
  ): AiRecommendation {
    // 1. If attempts have reached or exceeded policy maximum -> MANUAL_INTERVENTION
    if (context.attemptCount >= context.merchantPolicySummary.maxRetries) {
      return {
        recommendedAction: 'MANUAL_INTERVENTION',
        confidenceScore: 0.85,
        reasoningSummary:
          'Fallback: All automated recovery attempts exhausted; routed for manual review.',
        parameters: {
          delayHours: 0,
          discountInr: 0,
        },
        requiresHumanReview: true,
      };
    }

    // 2. Temporary network glitch & attempts remaining -> SMART_RETRY
    if (
      (context.failureCategory === 'TEMPORARY_NETWORK' ||
        context.failureReason.includes('GATEWAY_TIMEOUT') ||
        context.failureReason.includes('NETWORK_ERROR')) &&
      context.attemptCount < context.merchantPolicySummary.maxRetries
    ) {
      return {
        recommendedAction: 'SMART_RETRY',
        confidenceScore: 0.88,
        reasoningSummary:
          'Fallback: Temporary gateway/network failure detected; smart retry scheduled.',
        parameters: {
          delayHours: 1,
          discountInr: 0,
        },
        requiresHumanReview: false,
      };
    }

    // 3. Insufficient funds or attempts >= 1 -> PAYMENT_LINK via Email
    if (
      context.failureCategory === 'INSUFFICIENT_FUNDS' ||
      context.attemptCount >= 1
    ) {
      return {
        recommendedAction: 'PAYMENT_LINK',
        confidenceScore: 0.92,
        reasoningSummary:
          'Fallback: Customer action required via alternative payment link.',
        parameters: {
          delayHours: 0,
          discountInr: 0,
          messageChannel: 'EMAIL',
        },
        requiresHumanReview: false,
      };
    }

    // 4. Default -> MANUAL_INTERVENTION
    return {
      recommendedAction: 'MANUAL_INTERVENTION',
      confidenceScore: 0.75,
      reasoningSummary:
        'Fallback: High risk or complex rejection; routed for manual review.',
      parameters: {
        delayHours: 0,
        discountInr: 0,
      },
      requiresHumanReview: true,
    };
  }

  private async callLlm(
    context: BoundedRecoveryContext
  ): Promise<{ recommendation: AiRecommendation; tokensUsed: { input: number; output: number } }> {
    const prompt = this.buildPrompt(context);

    if (this.config.provider === 'gemini' && this.config.apiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.modelName || 'gemini-1.5-flash'}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) throw new Error('Empty model output');

      const parsedJson = JSON.parse(textOutput);
      const validated = AiRecommendationSchema.parse(parsedJson);

      return {
        recommendation: validated,
        tokensUsed: {
          input: data?.usageMetadata?.promptTokenCount || 450,
          output: data?.usageMetadata?.candidatesTokenCount || 80,
        },
      };
    }

    return {
      recommendation: this.executeDeterministicFallback(context),
      tokensUsed: { input: 0, output: 0 },
    };
  }

  private buildPrompt(context: BoundedRecoveryContext): string {
    return `
You are the RecoverAI Revenue Recovery Orchestrator.
Analyze the following bounded payment failure context and recommend the optimal recovery strategy conforming to the JSON schema.

Bounded Context:
- Case ID: ${context.caseId}
- Amount: INR ${context.amountInr}
- Failure Reason: ${context.failureReason}
- Failure Category: ${context.failureCategory}
- Attempt Count: ${context.attemptCount} / ${context.merchantPolicySummary.maxRetries}
- Customer LTV Tier: ${context.customerLtvTier}
- Max Allowed Discount: INR ${context.merchantPolicySummary.maxDiscountInr}

${
  context.sanitizedCustomerNote
    ? `=== BEGIN UNTRUSTED CUSTOMER DATA ===\nNote: ${context.sanitizedCustomerNote}\n=== END UNTRUSTED CUSTOMER DATA ===`
    : ''
}

Respond ONLY with a JSON object matching this structure:
{
  "recommendedAction": "SMART_RETRY" | "PAYMENT_LINK" | "CUSTOMER_MESSAGING" | "INCENTIVE_OFFER" | "MANUAL_INTERVENTION",
  "confidenceScore": number (0.0 to 1.0),
  "reasoningSummary": string (max 255 chars),
  "parameters": {
    "delayHours": number,
    "discountInr": number,
    "messageChannel": "EMAIL" | "SMS" | "WHATSAPP"
  },
  "requiresHumanReview": boolean
}
`;
  }
}
