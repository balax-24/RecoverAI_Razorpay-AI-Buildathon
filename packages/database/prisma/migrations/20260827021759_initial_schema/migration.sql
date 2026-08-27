-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('PENDING', 'EVALUATING', 'ACTION_SCHEDULED', 'ACTION_EXECUTED', 'IN_GRACE_PERIOD', 'PENDING_APPROVAL', 'RECOVERED', 'EXHAUSTED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecoveryActionType" AS ENUM ('SMART_RETRY', 'PAYMENT_LINK', 'CUSTOMER_MESSAGING', 'INCENTIVE_OFFER', 'MANUAL_INTERVENTION');

-- CreateEnum
CREATE TYPE "ActionExecutionStatus" AS ENUM ('SCHEDULED', 'EXECUTING', 'SUCCESS', 'FAILED', 'SKIPPED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'AI_AGENT', 'SYSTEM', 'WEBHOOK', 'WORKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'VALIDATED', 'ENQUEUED', 'PROCESSED', 'DUPLICATE', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'MISMATCH_DETECTED', 'RECONCILED_AUTOMATICALLY', 'MANUAL_ATTENTION_REQUIRED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "razorpay_key_id" VARCHAR(100),
    "razorpay_secret_enc" TEXT,
    "webhook_secret_enc" TEXT,
    "is_live_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mfa_secret_enc" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_token" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "external_ref" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "name" VARCHAR(150) NOT NULL,
    "ltv_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "risk_score" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "razorpay_order_id" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "razorpay_payment_id" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "method" VARCHAR(50),
    "bank" VARCHAR(100),
    "wallet" VARCHAR(100),
    "vpa" VARCHAR(100),
    "error_code" VARCHAR(100),
    "error_description" TEXT,
    "error_source" VARCHAR(100),
    "error_step" VARCHAR(100),
    "error_reason" VARCHAR(100),
    "raw_event_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'razorpay',
    "provider_event_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "processing_status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "processing_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "trace_id" VARCHAR(100),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_processed_at" TIMESTAMP(3),
    "last_processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_cases" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount_at_risk" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "reason_code" VARCHAR(100) NOT NULL,
    "priority_score" INTEGER NOT NULL DEFAULT 50,
    "status" "RecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "current_strategy" "RecoveryActionType",
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_allowed_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_action_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "recovered_payment_id" VARCHAR(100),
    "trace_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_actions" (
    "id" UUID NOT NULL,
    "recovery_case_id" UUID NOT NULL,
    "action_type" "RecoveryActionType" NOT NULL,
    "requested_by" "ActorType" NOT NULL,
    "policy_decision" VARCHAR(50) NOT NULL,
    "execution_status" "ActionExecutionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "idempotency_key" VARCHAR(255) NOT NULL,
    "action_payload" JSONB NOT NULL,
    "execution_result" JSONB,
    "provider_reference" VARCHAR(150),
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "scheduled_for" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_recovery_tokens" (
    "id" UUID NOT NULL,
    "recovery_case_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "accessed_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_recovery_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "rules_dsl" JSONB NOT NULL,
    "max_discount_inr" DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    "max_retry_attempts" INTEGER NOT NULL DEFAULT 3,
    "min_interval_hours" INTEGER NOT NULL DEFAULT 6,
    "high_value_threshold" DECIMAL(12,2) NOT NULL DEFAULT 10000.00,
    "requires_human_review" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "recovery_case_id" UUID NOT NULL,
    "requested_by" "ActorType" NOT NULL DEFAULT 'AI_AGENT',
    "requested_action" "RecoveryActionType" NOT NULL,
    "action_payload" JSONB NOT NULL,
    "reason_code" VARCHAR(100) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_by_id" UUID,
    "review_notes" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_registry" (
    "id" UUID NOT NULL,
    "prompt_key" VARCHAR(100) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "template_schema" JSONB NOT NULL,
    "model_target" VARCHAR(100) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_decision_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "recovery_case_id" UUID NOT NULL,
    "prompt_key" VARCHAR(100) NOT NULL,
    "prompt_version" VARCHAR(50) NOT NULL,
    "model_provider" VARCHAR(50) NOT NULL,
    "model_name" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "estimated_cost_usd" DECIMAL(8,6) NOT NULL,
    "bounded_context" JSONB NOT NULL,
    "raw_model_output" JSONB NOT NULL,
    "parsed_decision" JSONB NOT NULL,
    "is_fallback_used" BOOLEAN NOT NULL DEFAULT false,
    "fallback_reason" VARCHAR(100),
    "trace_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "template_key" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(100) NOT NULL,
    "reason_code" VARCHAR(100),
    "policy_id" VARCHAR(100),
    "request_id" VARCHAR(100),
    "trace_id" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "previous_state" JSONB,
    "new_state" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "payment_id" VARCHAR(100) NOT NULL,
    "db_status" "PaymentStatus" NOT NULL,
    "gateway_status" "PaymentStatus" NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'MATCHED',
    "action_taken" TEXT,
    "discrepancy_details" JSONB,
    "reconciled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_feature_flags" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "config_value" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_session_token_idx" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "customers_organization_id_email_idx" ON "customers"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organization_id_external_ref_key" ON "customers"("organization_id", "external_ref");

-- CreateIndex
CREATE UNIQUE INDEX "orders_razorpay_order_id_key" ON "orders"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "orders_organization_id_idx" ON "orders"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payments_organization_id_status_idx" ON "payments"("organization_id", "status");

-- CreateIndex
CREATE INDEX "payments_organization_id_created_at_idx" ON "payments"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_events_processing_status_received_at_idx" ON "webhook_events"("processing_status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_provider_event_id_key" ON "webhook_events"("provider", "provider_event_id");

-- CreateIndex
CREATE INDEX "recovery_cases_organization_id_status_idx" ON "recovery_cases"("organization_id", "status");

-- CreateIndex
CREATE INDEX "recovery_cases_organization_id_next_action_at_idx" ON "recovery_cases"("organization_id", "next_action_at");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_actions_idempotency_key_key" ON "recovery_actions"("idempotency_key");

-- CreateIndex
CREATE INDEX "recovery_actions_recovery_case_id_idx" ON "recovery_actions"("recovery_case_id");

-- CreateIndex
CREATE INDEX "recovery_actions_execution_status_scheduled_for_idx" ON "recovery_actions"("execution_status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "customer_recovery_tokens_token_hash_key" ON "customer_recovery_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "customer_recovery_tokens_token_hash_idx" ON "customer_recovery_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "policies_organization_id_is_active_idx" ON "policies"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "policies_organization_id_code_version_key" ON "policies"("organization_id", "code", "version");

-- CreateIndex
CREATE INDEX "approvals_recovery_case_id_idx" ON "approvals"("recovery_case_id");

-- CreateIndex
CREATE INDEX "approvals_status_idx" ON "approvals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_registry_prompt_key_version_key" ON "prompt_registry"("prompt_key", "version");

-- CreateIndex
CREATE INDEX "ai_decision_logs_organization_id_recovery_case_id_idx" ON "ai_decision_logs"("organization_id", "recovery_case_id");

-- CreateIndex
CREATE INDEX "notification_outbox_is_sent_created_at_idx" ON "notification_outbox"("is_sent", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_organization_id_timestamp_idx" ON "audit_events"("organization_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_events_resource_type_resource_id_idx" ON "audit_events"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_events_trace_id_idx" ON "audit_events"("trace_id");

-- CreateIndex
CREATE INDEX "reconciliation_logs_organization_id_status_idx" ON "reconciliation_logs"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_feature_flags_organization_id_key_key" ON "tenant_feature_flags"("organization_id", "key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_cases" ADD CONSTRAINT "recovery_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_cases" ADD CONSTRAINT "recovery_cases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_cases" ADD CONSTRAINT "recovery_cases_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_recovery_case_id_fkey" FOREIGN KEY ("recovery_case_id") REFERENCES "recovery_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_recovery_tokens" ADD CONSTRAINT "customer_recovery_tokens_recovery_case_id_fkey" FOREIGN KEY ("recovery_case_id") REFERENCES "recovery_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_recovery_case_id_fkey" FOREIGN KEY ("recovery_case_id") REFERENCES "recovery_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_logs" ADD CONSTRAINT "reconciliation_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_feature_flags" ADD CONSTRAINT "tenant_feature_flags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
