import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { prisma } from '@recoverai/database';

@Controller('policies')
export class PoliciesController {
  @Get()
  public async getPolicies(@Req() req: Request) {
    const defaultOrg = await prisma.organization.findFirst({
      where: { slug: 'acme-stores' },
    });

    if (!defaultOrg) {
      return [];
    }

    const policies = await prisma.policy.findMany({
      where: { organizationId: defaultOrg.id },
      orderBy: { createdAt: 'desc' },
    });

    if (policies.length === 0) {
      // Return default configured policy
      return [
        {
          id: 'pol_default_01',
          code: 'DEFAULT_POLICY',
          name: 'Standard E-Commerce Recovery Policy',
          version: 1,
          maxRetryAttempts: 3,
          maxDiscountInr: 100,
          highValueThreshold: 10000,
          minIntervalHours: 6,
          requiresHumanReview: false,
          isActive: true,
          rulesDSL: {
            max_retries: 3,
            max_discount_inr: 100,
            cooldown_hours: 6,
            high_value_threshold_inr: 10000,
            allowed_actions: [
              'SMART_RETRY',
              'PAYMENT_LINK',
              'CUSTOMER_MESSAGING',
              'INCENTIVE_OFFER',
            ],
            restricted_reasons_for_retry: ['CARD_STOLEN', 'ACCOUNT_BLOCKED'],
          },
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    return policies;
  }
}
