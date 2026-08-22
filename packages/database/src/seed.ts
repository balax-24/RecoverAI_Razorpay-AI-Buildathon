import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding RecoverAI database...');

  // 1. Create Demo Merchant Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-stores' },
    create: {
      name: 'Acme Stores',
      slug: 'acme-stores',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
      isLiveMode: false,
    },
    update: {},
  });

  // 2. Create Admin User with sample password hash
  const passwordHash = `$argon2id$v=19$m=65536,t=3,p=4$${crypto.randomBytes(16).toString('hex')}$${crypto.randomBytes(32).toString('hex')}`;

  await prisma.user.upsert({
    where: { email: 'admin@acmestores.com' },
    create: {
      organizationId: org.id,
      email: 'admin@acmestores.com',
      fullName: 'Vikram Merchant',
      passwordHash,
      role: 'ADMIN',
    },
    update: {},
  });

  // 3. Create Default Recovery Policy
  await prisma.policy.upsert({
    where: {
      organizationId_code_version: {
        organizationId: org.id,
        code: 'DEFAULT_POLICY',
        version: 1,
      },
    },
    create: {
      organizationId: org.id,
      code: 'DEFAULT_POLICY',
      name: 'Standard E-Commerce Recovery Policy',
      version: 1,
      maxDiscountInr: 100,
      maxRetryAttempts: 3,
      minIntervalHours: 6,
      highValueThreshold: 10000,
      requiresHumanReview: false,
      rulesDSL: {
        max_retries: 3,
        max_discount_inr: 100,
        cooldown_hours: 6,
        high_value_threshold_inr: 10000,
        allowed_actions: ['SMART_RETRY', 'PAYMENT_LINK', 'CUSTOMER_MESSAGING', 'INCENTIVE_OFFER'],
        restricted_reasons_for_retry: ['CARD_STOLEN', 'ACCOUNT_BLOCKED'],
      },
    },
    update: {},
  });

  // 4. Create Sample Customer
  await prisma.customer.upsert({
    where: {
      organizationId_externalRef: {
        organizationId: org.id,
        externalRef: 'cust_rahul_1',
      },
    },
    create: {
      organizationId: org.id,
      externalRef: 'cust_rahul_1',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      phone: '+919876543210',
      ltvAmount: 14500,
    },
    update: {},
  });

  console.log('Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
