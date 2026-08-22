# RecoverAI — Operational Incident Runbooks

## Runbook 1: Webhook Ingestion Failure Spike
- **Trigger**: Webhook error rate > 1% over 5 minutes.
- **Diagnosis**:
  1. Inspect API logs: `grep 'Invalid Razorpay webhook signature'`.
  2. Verify secret matching: Ensure `RAZORPAY_WEBHOOK_SECRET` matches Razorpay merchant dashboard.
  3. Verify raw body capture: Check if middleware altered request streams.
- **Remediation**:
  1. If signature key was rotated without updating RecoverAI, update secret in config.
  2. Use Ops Console to re-trigger failed events from `webhook_events` Dead-Letter Queue.

---

## Runbook 2: BullMQ Queue Backlog & Worker Saturation
- **Trigger**: Queue lag > 500 jobs or job processing latency > 5 seconds.
- **Diagnosis**:
  1. Run `pnpm --filter @recoverai/worker status`.
  2. Check Redis memory and connection saturation.
  3. Inspect worker logs for unhandled slow external calls.
- **Remediation**:
  1. Scale worker concurrency from 5 to 20 workers.
  2. Verify Redis max-memory policy is set to `noeviction`.

---

## Runbook 3: AI Provider Latency Spike or Outage
- **Trigger**: AI decision latency > 1500ms or 5xx error rate from LLM provider.
- **Diagnosis**:
  1. Check `ai_decision_logs` for `is_fallback_used = true` and `fallback_reason`.
  2. Verify Gemini API quota and status dashboard.
- **Remediation**:
  1. Zero customer impact: The Sub-1500ms Fallback Race automatically engages deterministic heuristics.
  2. If prolonged, toggle `AI_PROVIDER=mock` to bypass external network calls completely.

---

## Runbook 4: Payment Reconciliation Discrepancy Alert
- **Trigger**: `reconciliation_logs` records `status = MISMATCH_DETECTED`.
- **Diagnosis**:
  1. Open Reconciliation Dashboard in Merchant Web Console.
  2. Compare `db_status` against `gateway_status` for the affected `payment_id`.
- **Remediation**:
  1. Trigger manual reconciliation via Ops Console: `POST /reconcile/trigger`.
  2. If payment captured on Razorpay, system automatically updates `recovery_cases` to `RECOVERED`.

---

## Runbook 5: Emergency Safe Mode Activation (Kill Switch)
- **Trigger**: Suspected policy anomaly, unauthorized automated action, or zero-day vulnerability.
- **Execution**:
  1. Set environment variable `SAFE_MODE_ENABLED=true` or toggle in Admin Console.
  2. All autonomous action executions are immediately frozen; all mutations route to the Human Approval Maker-Checker Queue.
- **De-escalation**:
  1. Audit `audit_events` ledger for suspicious entries.
  2. Once verified safe, toggle `SAFE_MODE_ENABLED=false`.

---

## Runbook 6: Secret Compromise & Rotation Procedure
- **Trigger**: Potential leak of `SESSION_SECRET`, `APP_ENCRYPTION_KEY`, or `RAZORPAY_KEY_SECRET`.
- **Execution**:
  1. Rotate `APP_ENCRYPTION_KEY`: Run migration script to re-encrypt sensitive rows with new key.
  2. Invalidate all active user sessions: `UPDATE sessions SET is_revoked = true;`.
  3. Update Razorpay API Keys in Merchant Dashboard and update `.env`.

---

## Runbook 7: Database Connection Pool Exhaustion
- **Trigger**: PostgreSQL pool usage > 80% or `timeout acquiring connection` errors.
- **Diagnosis**:
  1. Check active connections: `SELECT count(*) FROM pg_stat_activity;`.
  2. Identify unindexed slow queries in `ai_decision_logs` or `audit_events`.
- **Remediation**:
  1. Increase PgBouncer / Prisma connection limit.
  2. Ensure worker processes reuse Prisma singleton instances across tasks.
