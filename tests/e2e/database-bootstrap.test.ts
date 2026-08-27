import { describe, it, expect } from 'vitest';
import { prisma } from '../../packages/database/src';

describe('Database Bootstrap & Migration Integrity Verification', () => {
  it('1. Required PostgreSQL Database Tables Exist and are Reachable', async () => {
    // Query PostgreSQL information_schema for public tables
    const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `;

    const tableNames = tables.map((t) => t.table_name);

    // Verify core required tables exist
    expect(tableNames).toContain('organizations');
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('customers');
    expect(tableNames).toContain('payments');
    expect(tableNames).toContain('recovery_cases');
    expect(tableNames).toContain('recovery_actions');
    expect(tableNames).toContain('approvals');
    expect(tableNames).toContain('policies');
    expect(tableNames).toContain('audit_events');
    expect(tableNames).toContain('webhook_events');
    expect(tableNames).toContain('ai_decision_logs');
    expect(tableNames).toContain('_prisma_migrations');
  });

  it('2. Prisma Migrations Table Has Recorded Initial Migration', async () => {
    const migrations: Array<{ migration_name: string; finished_at: Date | null }> = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      WHERE rolled_back_at IS NULL;
    `;

    expect(migrations.length).toBeGreaterThanOrEqual(1);
    expect(migrations.some((m) => m.migration_name.includes('initial_schema'))).toBe(true);
    expect(migrations[0].finished_at).not.toBeNull();
  });

  it('3. Seeded Entities Exist in Database', async () => {
    const org = await prisma.organization.findUnique({
      where: { slug: 'acme-stores' },
    });

    expect(org).not.toBeNull();
    expect(org?.name).toBe('Acme Stores');

    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@acmestores.com' },
    });
    expect(adminUser).not.toBeNull();
    expect(adminUser?.role).toBe('ADMIN');

    const defaultPolicy = await prisma.policy.findFirst({
      where: { organizationId: org!.id, code: 'DEFAULT_POLICY' },
    });
    expect(defaultPolicy).not.toBeNull();
    expect(defaultPolicy?.rulesDSL).toBeDefined();

    const cases = await prisma.recoveryCase.findMany({
      where: { organizationId: org!.id },
    });
    expect(cases.length).toBeGreaterThan(0);
  });
});
