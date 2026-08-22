# RecoverAI — Autonomous Revenue Recovery & Payment Operations Platform

> **RecoverAI is an autonomous revenue-recovery platform that detects failed payments, evaluates recovery opportunities, recommends bounded recovery actions, enforces deterministic policies, executes permitted actions, and verifies the final payment outcome.**

> *"AI proposes. Policies authorize. Executors act. Verification confirms."*  
> **The LLM is advisory; financial execution is strictly controlled by deterministic policy and authorization layers.**

---

## 🎯 Architecture Diagram

```text
                 PAYMENT EVENT (Razorpay Webhook)
                               │
                               ▼
                        WEBHOOK GATEWAY
                               │
                      verify + dedupe (<25ms)
                               │
                               ▼
                         BULLMQ QUEUE
                               │
                               ▼
                        RECOVERY ENGINE
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
       AI LAYER          POLICY LAYER           RISK LAYER
  (Gemini / Fallback)     (Rules DSL)       (Threshold & Auth)
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
                        ACTION EXECUTOR
                               │
                               ▼
                   CUSTOMER NOTIFICATION / LINK
                          `/r/[token]`
                               │
                               ▼
                         RAZORPAY API
                        (Capture Event)
                               │
                               ▼
                          VERIFICATION
                               │
                               ▼
                         AUDIT + EVENTS
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
        PINO LOGS           METRICS           TRACES
      (Sensitive Redacted)   (SLAs)       (W3C Trace ID)
```

---

## 🧪 Rigorous Verification & Evidence (In Our Test Environment)

- **75/75 automated tests passing** across unit, state machine, and integration suites.
- **50-scenario AI golden evaluation** with **0 unsafe executable actions** recorded.
- **Razorpay webhook ingestion benchmark:** 500 RPS, p95 14.8 ms, 0% errors under the documented benchmark configuration.
- **Duplicate webhook handling verified** via `payloadHash` unique ledger constraints.
- **Out-of-order event convergence verified** with late capture state machine transitions.
- **AI failure fallback verified** with sub-1500ms race and < 1ms deterministic fallback.
- **Automated reconciliation workflow verified** via 30-min PostgreSQL vs Razorpay gateway diffing.
- **Trace correlation verified** via W3C distributed `trace_id` propagation.
- **Security tests aligned with OWASP ASVS** covering injection, maker-checker segregation, constant-time verification, and RBAC privilege barriers.

---

## 🚀 Clean-Room Quick Start (Evaluator Reproduction)

```bash
# 1. Clone repository & configure environment
git clone https://github.com/balax-24/RecoverAI---Razorpay-AI-Buildathon.git
cd RecoverAI---Razorpay-AI-Buildathon
cp .env.example .env

# 2. Launch local infrastructure (Postgres 16, Redis 7, MailHog, Jaeger)
docker compose up -d

# 3. Install dependencies, generate Prisma client, migrate & seed
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 4. Build monorepo & execute full test suite
pnpm build
pnpm vitest run

# 5. Launch all services concurrently
pnpm dev
```

### Runtime Surfaces
- **Merchant Operations Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Customer Recovery Web Portal**: `http://localhost:3000/r/[token]`
- **Chaos & Fault Injection Console**: [http://localhost:3001](http://localhost:3001)
- **NestJS Ingestion & REST API**: [http://localhost:4000](http://localhost:4000)
- **MailHog Local SMTP & Email Viewer**: [http://localhost:8025](http://localhost:8025)
- **Jaeger Distributed Tracing UI**: [http://localhost:16686](http://localhost:16686)

---

## 🔒 Security & PCI Minimization Architecture
- **Zero Cardholder PAN/CVV Retention**: Only stores Razorpay reference tokens (`pay_xxx`, `order_xxx`).
- **AES-256-GCM Encryption**: Encrypts secret key material and OAuth tokens at rest with random IVs and authentication tags.
- **Argon2id Constant-Time Hashing**: Memory-hard password hashing with timing-safe comparisons.
- **Maker-Checker Segregation**: High-value recoveries (> ₹10,000) enforce `Approval.reviewed_by_id != Approval.requested_by_id`.
- **Policy Sandbox**: AI recommendations are treated as untrusted data, passed through strict Zod schemas, and bounded by deterministic policy rules.

---

## 📁 Submission Deliverables & Documentation
- [Final Submission Audit](file:///home/buzzard/Documents/Projects/Razorpay%20Intern/docs/evidence/final-submission-audit.md)
- [Official Form Answers](file:///home/buzzard/Documents/Projects/Razorpay%20Intern/docs/presentation/submission-form-answers.md)
- [5-Minute Video Pitch Script](file:///home/buzzard/Documents/Projects/Razorpay%20Intern/docs/presentation/5-minute-video-script.md)
- [Technical Specification](file:///home/buzzard/Documents/Projects/Razorpay%20Intern/docs/architecture/technical-specification.md)
- [Architectural Decision Records (ADRs 001–010)](file:///home/buzzard/Documents/Projects/Razorpay%20Intern/docs/adr/ADR-001-to-010.md)
- [Operational Runbooks](file:///home/buzzard/Documents/Projects/Razorpay%20Intern/docs/runbooks/INCIDENT-RUNBOOKS.md)
- [Evidence Catalog](file:///home/buzzard/Documents/Projects/Razorpay%20Intern/docs/evidence/)
