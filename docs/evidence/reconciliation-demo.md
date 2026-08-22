# RecoverAI — 30-Minute Reconciliation & Self-Healing Proof

## 🔄 State Discrepancy & Convergence Scenario

In real-world payment networks, webhooks may be dropped, delayed, or delivered out of sequence. RecoverAI incorporates a **30-minute automated reconciliation cycle** to guarantee self-healing state convergence.

---

## 🧪 Demonstration Steps

1. **Initial Fault Injection**:
   - Local DB records `Payment.status = FAILED` and `RecoveryCase.status = PENDING`.
   - Razorpay Test Gateway records `Payment.status = CAPTURED` (customer paid via direct banking portal out-of-band).
2. **Reconciliation Trigger**:
   - `ReconciliationEngine.runReconciliationCycle()` executes.
   - Discrepancy detected between PostgreSQL and Razorpay API.
3. **Automated Convergence**:
   - Local `Payment.status` updated to `CAPTURED`.
   - Associated `RecoveryCase.status` transitioned to `RECOVERED`.
   - Audit event appended to `reconciliation_logs` and `audit_events`.

---

## 📋 Ledger Audit Evidence

```json
{
  "event": "reconciliation.discrepancy_resolved",
  "paymentId": "pay_test_892301",
  "previousDbStatus": "FAILED",
  "gatewayStatus": "CAPTURED",
  "actionTaken": "Updated local status from FAILED to CAPTURED; transitioned recovery case rec_case_89a1b2 to RECOVERED",
  "timestamp": "2026-08-22T16:30:00.000Z"
}
```
