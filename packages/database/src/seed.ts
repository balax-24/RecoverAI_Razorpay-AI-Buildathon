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
        restricted_reasons_for_retry: ['CARD_STOLEN', 'ACCOUNT_BLOCKED', 'FRAUD_SUSPECTED'],
      },
    },
    update: {},
  });

  // 4. Create Sample Customers
  const seedCustomers = [
    { externalRef: 'cust_rahul_1', name: 'Rahul Sharma', email: 'rahul.sharma@example.com', phone: '+919876543210', ltv: 14500 },
    { externalRef: 'cust_priya_2', name: 'Priya Patel', email: 'priya.patel@example.com', phone: '+919812345678', ltv: 28000 },
    { externalRef: 'cust_amit_3', name: 'Amit Kumar', email: 'amit.kumar@example.com', phone: '+919823456789', ltv: 8500 },
    { externalRef: 'cust_ananya_4', name: 'Ananya Iyer', email: 'ananya.iyer@example.com', phone: '+919834567890', ltv: 42000 },
    { externalRef: 'cust_vikram_5', name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '+919845678901', ltv: 19500 },
    { externalRef: 'cust_sneha_6', name: 'Sneha Roy', email: 'sneha.roy@example.com', phone: '+919856789012', ltv: 6200 },
  ];

  const createdCustomers: Record<string, string> = {};

  for (const c of seedCustomers) {
    const cust = await prisma.customer.upsert({
      where: {
        organizationId_externalRef: {
          organizationId: org.id,
          externalRef: c.externalRef,
        },
      },
      create: {
        organizationId: org.id,
        externalRef: c.externalRef,
        name: c.name,
        email: c.email,
        phone: c.phone,
        ltvAmount: c.ltv,
      },
      update: {},
    });
    createdCustomers[c.externalRef] = cust.id;
  }

  // 5. Create Sample Payments, Cases, and Approvals
  const seedCases = [
    {
      paymentRef: 'pay_seed_001',
      customerRef: 'cust_rahul_1',
      amount: 3200,
      reasonCode: 'INSUFFICIENT_FUNDS',
      status: 'RECOVERED' as const,
      strategy: 'PAYMENT_LINK',
    },
    {
      paymentRef: 'pay_seed_002',
      customerRef: 'cust_priya_2',
      amount: 14500,
      reasonCode: 'GATEWAY_TIMEOUT',
      status: 'PENDING_APPROVAL' as const,
      strategy: 'SMART_RETRY',
    },
    {
      paymentRef: 'pay_seed_003',
      customerRef: 'cust_amit_3',
      amount: 1850,
      reasonCode: 'NETWORK_TIMEOUT',
      status: 'ACTION_EXECUTED' as const,
      strategy: 'SMART_RETRY',
    },
    {
      paymentRef: 'pay_seed_004',
      customerRef: 'cust_ananya_4',
      amount: 22000,
      reasonCode: 'AUTHENTICATION_FAILED',
      status: 'PENDING_APPROVAL' as const,
      strategy: 'PAYMENT_LINK',
    },
    {
      paymentRef: 'pay_seed_005',
      customerRef: 'cust_vikram_5',
      amount: 4500,
      reasonCode: 'CARD_EXPIRED',
      status: 'PENDING' as const,
      strategy: 'CUSTOMER_MESSAGING',
    },
    {
      paymentRef: 'pay_seed_006',
      customerRef: 'cust_sneha_6',
      amount: 899,
      reasonCode: 'INSUFFICIENT_FUNDS',
      status: 'RECOVERED' as const,
      strategy: 'INCENTIVE_OFFER',
    },
  ];

  for (const sc of seedCases) {
    const customerId = createdCustomers[sc.customerRef];
    if (!customerId) continue;

    const payment = await prisma.payment.upsert({
      where: { razorpayPaymentId: sc.paymentRef },
      create: {
        organizationId: org.id,
        customerId,
        razorpayPaymentId: sc.paymentRef,
        amount: sc.amount,
        currency: 'INR',
        status: sc.status === 'RECOVERED' ? 'CAPTURED' : 'FAILED',
        method: 'card',
        errorCode: sc.reasonCode,
        errorReason: sc.reasonCode.toLowerCase(),
      },
      update: {},
    });

    const existingCase = await prisma.recoveryCase.findFirst({
      where: { paymentId: payment.id },
    });

    if (!existingCase) {
      const traceId = `tr_seed_${crypto.randomBytes(6).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const recCase = await prisma.recoveryCase.create({
        data: {
          organizationId: org.id,
          customerId,
          paymentId: payment.id,
          status: sc.status,
          amountAtRisk: sc.amount,
          currency: 'INR',
          reasonCode: sc.reasonCode,
          priorityScore: Math.min(98, Math.floor(sc.amount / 200) + 50),
          currentStrategy: sc.strategy as any,
          traceId,
          expiresAt,
        },
      });

      // Create Audit Event
      await prisma.auditEvent.create({
        data: {
          organizationId: org.id,
          actorType: 'SYSTEM',
          action: 'RECOVERY_CASE_SEEDED',
          resourceType: 'RECOVERY_CASE',
          resourceId: recCase.id,
          traceId,
          metadata: { amount: sc.amount, strategy: sc.strategy, reasonCode: sc.reasonCode },
        },
      });

      // If Pending Approval, create Approval record
      if (sc.status === 'PENDING_APPROVAL') {
        await prisma.approval.create({
          data: {
            recoveryCaseId: recCase.id,
            requestedBy: 'SYSTEM',
            requestedAction: sc.strategy as any,
            actionPayload: { amount: sc.amount, strategy: sc.strategy },
            reasonCode: 'HIGH_VALUE_THRESHOLD_EXCEEDED',
            status: 'PENDING_REVIEW',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

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
