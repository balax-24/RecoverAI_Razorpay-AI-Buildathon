import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Creates a tenant-scoped Prisma client extension
 */
export function getTenantPrisma(organizationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, args, query }: any) {
          if (
            ['findFirst', 'findMany', 'count', 'updateMany', 'deleteMany'].includes(
              operation
            )
          ) {
            args.where = {
              ...args.where,
              organizationId,
            };
          }
          return query(args);
        },
      },
    },
  });
}
