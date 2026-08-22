import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { WebhooksController } from './webhooks/webhooks.controller';
import { AuthController } from './auth/auth.controller';
import { RecoveryController } from './recovery/recovery.controller';
import { ApprovalsController } from './approvals/approvals.controller';
import { CustomerRecoveryController } from './customer/customer.controller';

@Module({
  imports: [],
  controllers: [
    HealthController,
    WebhooksController,
    AuthController,
    RecoveryController,
    ApprovalsController,
    CustomerRecoveryController,
  ],
  providers: [],
})
export class AppModule {}
