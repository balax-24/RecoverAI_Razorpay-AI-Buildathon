import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { WebhooksController } from './webhooks/webhooks.controller';
import { AuthController } from './auth/auth.controller';
import { RecoveryController } from './recovery/recovery.controller';
import { ApprovalsController } from './approvals/approvals.controller';
import { CustomerRecoveryController } from './customer/customer.controller';
import { SimulationController } from './simulation/simulation.controller';
import { PoliciesController } from './policies/policies.controller';
import { ReconciliationController } from './reconciliation/reconciliation.controller';
import { AuditController } from './audit/audit.controller';
import { DebugController } from './debug/debug.controller';

@Module({
  imports: [],
  controllers: [
    HealthController,
    WebhooksController,
    AuthController,
    RecoveryController,
    ApprovalsController,
    CustomerRecoveryController,
    SimulationController,
    PoliciesController,
    ReconciliationController,
    AuditController,
    DebugController,
  ],
  providers: [],
})
export class AppModule {}
