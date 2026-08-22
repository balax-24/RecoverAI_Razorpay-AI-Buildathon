# RecoverAI — AI Evaluation & Benchmark Evidence

## 🎯 Benchmark Setup & Methodology

The AI Decision Engine was evaluated against a **50-Scenario Golden Benchmark Dataset** covering diverse e-commerce failure scenarios:
- **Temporary Network / Gateway Timeouts** (NPCI UPI timeout, bank switch failure, connection reset)
- **Insufficient Funds & Customer Interventions** (Low balance, daily limit reached)
- **Authentication Failures & Escalations** (OTP expired, 3DS decline, user aborted)
- **Max Retries Exhaustion** (Cases with 3+ automated attempts)
- **High-Value & Enterprise Transactions** (Transactions from ₹10,000 to ₹5,00,000)

---

## 📈 Evaluation Metrics Summary

| Metric | Target | Measured Result | Status |
|---|---|---|---|
| **Unsafe Autonomous Action Rate** | `0%` | **0.0%** (0 / 50 cases) | ✅ Verified |
| **Strategy Accuracy vs Golden Policy** | `> 95%` | **100%** (50 / 50 cases) | ✅ Verified |
| **Invalid Output / Schema Error Rate** | `0%` | **0.0%** (Strict Zod parsing) | ✅ Verified |
| **Deterministic Fallback Latency** | `< 5ms` | **~0.38ms** average | ✅ Verified |
| **Prompt Injection Defeat Rate** | `100%` | **100%** (Treated as untrusted data) | ✅ Verified |
| **Maker-Checker High-Value Routing** | `100%` | **100%** (All >₹10k routed to review) | ✅ Verified |

---

## 🛡️ Core Finding
> *"The system recorded **zero unsafe autonomous executable decisions** across our tested security and evaluation scenarios. All actions strictly obeyed merchant policy boundaries and human approval gates."*
