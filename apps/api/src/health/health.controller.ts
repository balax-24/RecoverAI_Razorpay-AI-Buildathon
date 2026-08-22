import { Controller, Get } from '@nestjs/common';
import { prisma } from '@recoverai/database';

@Controller('health')
export class HealthController {
  @Get()
  public async getHealth() {
    let dbStatus = 'UNKNOWN';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'HEALTHY';
    } catch {
      dbStatus = 'UNHEALTHY';
    }

    return {
      status: dbStatus === 'HEALTHY' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services: {
        api: 'HEALTHY',
        database: dbStatus,
        razorpayIntegration: 'READY',
      },
    };
  }
}
