# RecoverAI — Autonomous Revenue Recovery & Payment Operations Platform

> **A production-oriented fintech platform for autonomous payment recovery, deterministic policy enforcement, reliable webhook processing, and automated reconciliation with Razorpay.**

### Core Principle

**AI proposes. Policies authorize. Executors act. Verification confirms.**

RecoverAI is designed around a simple idea:

> A failed payment should trigger a controlled recovery workflow rather than a blind retry or a manual process.

AI is used where contextual decision-making is useful, while financial execution remains behind deterministic validation, authorization, and verification boundaries.

> **Demo / Test Mode:** RecoverAI uses Razorpay Test Mode for the project demonstration. No real-money payment processing is required for the demo.

---

## 🎥 Demo

**5-minute product walkthrough:** `PASTE_YOUR_UNLISTED_VIDEO_LINK_HERE`

The recording demonstrates:

```text
Merchant Dashboard
      ↓
Synthetic Payment Injection
      ↓
Live Recovery Cases
      ↓
AI Recommendation
      ↓
Deterministic Policy Check
      ↓
Controlled Action
      ↓
Verification
      ↓
Audit + Trace
```

It also demonstrates AI timeout fallback, duplicate webhook handling, adversarial prompt-injection blocking, and reconciliation.

---

## 🎯 What is RecoverAI?

RecoverAI is an autonomous revenue recovery and payment operations platform for failed payments.

Instead of treating every failed payment the same way, RecoverAI:

1. Receives and verifies payment events.
2. Prevents duplicate webhook processing.
3. Creates a recovery case.
4. Builds a bounded context for AI analysis.
5. Uses an AI orchestrator to recommend a recovery strategy.
6. Validates that recommendation using deterministic policies.
7. Requests human approval for sensitive actions when necessary.
8. Executes only permitted actions.
9. Verifies the resulting payment state.
10. Records the workflow through audit events and traces.
11. Reconciles local payment state against Razorpay when state divergence occurs.

---

# 🧠 The Core Architecture

```text
                         RAZORPAY TEST MODE
                                │
                                │ Webhook
                                ▼
                    ┌─────────────────────────┐
                    │     WEBHOOK GATEWAY     │
                    │                         │
                    │ Raw Body Preservation   │
                    │ HMAC Verification      │
                    │ Idempotency             │
                    └────────────┬────────────┘
                                 │
                                 ▼
                         Redis / BullMQ
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    RECOVERY ENGINE      │
                    │                         │
                    │ Recovery Case           │
                    │ Bounded Context         │
                    │ AI Recommendation       │
                    │ Policy Evaluation       │
                    │ Human Approval          │
                    │ Action Execution        │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       VERIFICATION      │
                    │                         │
                    │ Provider State          │
                    │ Local State             │
                    │ Reconciliation          │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
             Audit            Metrics           Traces
                │                │                │
                └────────────────┼────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    MERCHANT DASHBOARD   │
                    └─────────────────────────┘
```

---

# 🔄 Recovery Flow

```text
Payment Failed
      │
      ▼
Razorpay Webhook
      │
      ▼
HMAC Signature Verification
      │
      ▼
Duplicate / Replay Check
      │
      ▼
Recovery Case
      │
      ▼
AI Recommendation
      │
      ▼
Schema Validation
      │
      ▼
Deterministic Policy
      │
      ├─────────────── BLOCKED
      │
      ▼
Human Approval (when required)
      │
      ▼
Controlled Action Executor
      │
      ▼
Razorpay / Notification Boundary
      │
      ▼
Payment Verification
      │
      ├─────────────── RECOVERED
      │
      ├─────────────── ESCALATED
      │
      └─────────────── EXHAUSTED
```

---

# 🤖 Why AI?

Traditional recovery systems often rely entirely on fixed rules such as:

```text
IF payment_failed
AND attempts < 3
THEN retry
```

Rules are useful for **hard boundaries**, but recovery strategy can also depend on context:

- failure reason
- previous recovery attempts
- customer history
- amount at risk
- timing
- policy restrictions
- recovery history

RecoverAI therefore separates the problem:

```text
AI
→ recommends the strategy

Policy Engine
→ decides whether that strategy is allowed

Executor
→ performs only the authorized action
```

The LLM is therefore **advisory rather than authoritative**.

---

# 🛡️ AI Safety Architecture

The AI output is treated as untrusted input.

```text
Customer / Payment Data
          │
          ▼
    Bounded Context
          │
          ▼
       AI Model
          │
          ▼
   Structured Output
          │
          ▼
    Schema Validation
          │
          ▼
 Deterministic Policy
          │
          ▼
 Authorization / Approval
          │
          ▼
      Action Executor
```

### Safety controls

- Bounded context construction
- Structured model output
- Runtime schema validation
- Explicit action capabilities
- Deterministic policy checks
- Maker-checker approval
- Execution limits
- AI timeout/fallback
- Audit metadata
- Prompt-injection defenses

Customer-controlled text is explicitly treated as **untrusted data**.

### Important invariant

> **The model does not have direct authority to perform financial mutations.**

---

# 🔐 Security Architecture

## Payment Data Minimization

RecoverAI does not need to store raw card PAN/CVV data for the project workflow.

The platform works with Razorpay resource identifiers such as:

```text
pay_xxx
order_xxx
```

rather than storing raw card credentials.

## Credential Protection

- Argon2id password hashing
- Encryption for sensitive application key material where required
- Environment/secret-based configuration
- No real credentials committed to Git

## Webhook Security

- Raw request body preservation
- HMAC SHA-256 signature validation
- Duplicate-event protection
- Controlled asynchronous processing

## Authorization

- Organization/tenant-aware access
- Role-based access control
- Object-level authorization
- Maker-checker separation for sensitive actions

## AI Security

- Untrusted customer content
- Strict schema validation
- Deterministic policy enforcement
- Explicit tool/action boundaries
- Safe fallback behaviour

---

# ⚙️ Reliability Model

RecoverAI assumes distributed systems can fail.

The system explicitly handles:

| Condition | Protection |
|---|---|
| Duplicate webhook | Idempotency ledger |
| Out-of-order events | State-aware processing + reconciliation |
| AI timeout | Deterministic fallback |
| Invalid AI output | Validation + fallback/review |
| Policy violation | Action blocked |
| Sensitive action | Human approval |
| Queue problems | Retry / backoff / operational visibility |
| Notification failure | Outbox-based retry |
| Provider/local mismatch | Reconciliation |
| Emergency condition | Safe Mode |

---

# 🔁 Reconciliation

Payment systems are asynchronous, so local state can temporarily disagree with provider state.

RecoverAI includes a reconciliation worker that compares local payment information against the provider.

```text
           PostgreSQL
               │
               │ Compare
               ▼
          Razorpay API
               │
               ▼
         State mismatch?
            /        \
          NO          YES
          │            │
          ▼            ▼
       Keep state   Resolve / Review
                       │
                       ▼
                  Audit Event
```

This provides a recovery path for:

- delayed webhooks
- missed webhooks
- out-of-band payment changes
- inconsistent local state

---

# 📊 Observability

RecoverAI separates the main observability signals.

## Logs

Structured events such as:

```text
webhook.received
webhook.verified
recovery.created
ai.decision
policy.allowed
action.completed
payment.verified
reconciliation.mismatch
```

## Metrics

Examples:

```text
Revenue at Risk
Recovered Revenue
Active Recovery Cases
Recovery Rate
Pending Approvals
Failed Jobs / DLQ
Queue Depth
Processing Latency
```

## Distributed Tracing

A single trace can connect:

```text
Webhook
   ↓
Worker
   ↓
AI
   ↓
Policy
   ↓
Action
   ↓
Verification
```

Jaeger is included in the local development environment for trace inspection.

---

# 🖥️ Merchant Operations Dashboard

The Merchant Dashboard is the operational interface for monitoring recovery.

### Main sections

- Recovery cases
- Live recovery pipeline
- Revenue at risk
- Recovered revenue
- Recovery rate
- Pending approvals
- Policies
- Audit trail
- Webhooks
- Reconciliation
- System health

### Recovery case inspection

Each case can expose:

```text
Payment
Failure reason
AI recommendation
Policy decision
Action
Verification
Audit timeline
Trace correlation
```

The UI does **not** expose model chain-of-thought. It shows concise decision metadata and reason summaries instead.

---

# 👤 Customer Recovery Portal

The customer-facing flow is intentionally simpler than the merchant console.

```text
Payment Recovery

Your payment could not be completed.

Amount: ₹X,XXX

[ Complete Payment ]
```

The customer-facing flow does not expose:

- internal recovery IDs
- AI internals
- policy internals
- operational logs
- provider secrets

Recovery URLs use opaque tokens rather than exposing internal database identifiers directly.

---

# 💥 Chaos & Simulation Console

RecoverAI includes an internal simulation and fault-injection console.

It can generate synthetic failed-payment events and exercise the same recovery pipeline used by the platform.

### Synthetic simulation

```text
Choose batch size
      ↓
Deterministic failure distribution
      ↓
Inject synthetic events
      ↓
Persist / queue
      ↓
Process recovery cases
      ↓
Observe results
```

### Supported chaos scenarios

```text
AI Timeout
Webhook Race / Duplicate Event
Queue Worker Failure
Safe Mode
Adversarial Prompt Injection
```

This allows the project to demonstrate:

- event ingestion
- asynchronous processing
- recovery workflows
- fallback behaviour
- idempotency
- policy enforcement
- security controls
- observability

---

# 🧪 Verification & Evidence

The project includes automated verification across multiple layers.

| Domain | What is verified |
|---|---|
| E2E Recovery | End-to-end recovery workflow |
| Fault Tolerance | Duplicate/out-of-order events, AI fallback, Safe Mode |
| Security | OWASP ASVS-aligned security tests |
| Red Team | Prompt injection, authorization, maker-checker, webhook tampering |
| AI Evaluation | Golden scenario benchmark |
| Observability | Trace correlation across the workflow |
| Reconciliation | Local/provider state convergence |
| Database Bootstrap | Clean migration + seed reproducibility |
| Browser Consistency | Simulation → API → database → dashboard |
| Pagination | Server-side recovery pagination |
| Approvals | Pending count consistency |

---

# 📈 Benchmark Results

## AI Evaluation

On the **50-scenario golden evaluation suite**:

- **50/50 expected strategic recommendations**
- **0 unsafe executable actions recorded**

These results apply to the tested scenario set and are **not presented as a universal accuracy or safety guarantee**.

## Webhook Ingestion

Under the documented benchmark configuration:

- **500 RPS**
- **p95: 14.8 ms**
- **0% errors**

This is specifically an **ingestion benchmark**, not a claim that the entire recovery workflow completes end-to-end at 500 RPS.

---

# 🧪 Testing

Tests are organized by concern:

```text
tests/
├── ai-evals/
├── e2e/
├── failure-paths/
├── load/
├── observability/
└── security/
```

### Typecheck

```bash
pnpm typecheck
```

### Build

```bash
pnpm build
```

### Full test suite

```bash
pnpm vitest run
```

### Load testing

```bash
k6 run tests/load/k6-load-test.js
```

The test suite includes scenarios covering:

- database bootstrap
- end-to-end recovery
- AI golden scenarios
- OWASP-aligned security controls
- red-team attacks
- failure paths
- trace correlation
- data consistency

---

# 🚀 Quick Start

## Prerequisites

- Node.js
- pnpm
- Docker Engine
- Docker Compose plugin
- Razorpay Test Mode configuration for provider integration
- AI provider configuration when live model calls are enabled

## 1. Clone

```bash
git clone https://github.com/balax-24/RecoverAI---Razorpay-AI-Buildathon.git
cd RecoverAI---Razorpay-AI-Buildathon
```

## 2. Start infrastructure

```bash
docker compose up -d
```

This starts:

```text
PostgreSQL 16
Redis 7
MailHog
Jaeger
```

Check:

```bash
docker compose ps
```

## 3. Configure environment

```bash
cp .env.example .env
```

Fill in the required local values.

**Never commit `.env` or real credentials.**

## 4. Install dependencies

```bash
pnpm install
```

## 5. Generate Prisma Client

```bash
pnpm db:generate
```

## 6. Apply migrations

```bash
pnpm db:migrate
```

## 7. Seed demo data

```bash
pnpm db:seed
```

## 8. Build

```bash
pnpm build
```

## 9. Run tests

```bash
pnpm vitest run
```

## 10. Start development services

```bash
pnpm dev
```

---

# 🌐 Runtime Surfaces

| Surface | URL | Purpose |
|---|---|---|
| Merchant Dashboard | `http://localhost:3000` | Recovery operations and analytics |
| Customer Recovery Portal | `http://localhost:3000/r/[token]` | Customer recovery flow |
| Chaos & Simulation Console | `http://localhost:3001` | Simulation and fault injection |
| API Gateway | `http://localhost:4000` | REST API and webhook ingestion |
| MailHog | `http://localhost:8025` | Local email inspection |
| Jaeger | `http://localhost:16686` | Distributed trace inspection |

---

# 📁 Repository Structure

```text
recoverai/
│
├── apps/
│   ├── api/              # NestJS API + webhook ingestion
│   ├── web/              # Merchant + customer Next.js application
│   ├── ops/              # Chaos / simulation console
│   └── worker/           # Background processing
│
├── packages/
│   ├── ai/               # AI orchestration
│   ├── auth/             # Authentication
│   ├── audit/            # Audit events
│   ├── database/         # Prisma schema, migrations, seed
│   ├── domain/           # Domain types and rules
│   ├── observability/    # Logging / tracing
│   ├── payments/         # Razorpay integration boundary
│   ├── policies/         # Deterministic policies
│   ├── recovery/         # Recovery domain
│   ├── security/         # Security utilities
│   └── validation/       # Shared validation
│
├── tests/
│   ├── ai-evals/
│   ├── e2e/
│   ├── failure-paths/
│   ├── load/
│   ├── observability/
│   └── security/
│
├── docs/
│   ├── adr/
│   ├── architecture/
│   ├── evidence/
│   ├── presentation/
│   └── runbooks/
│
├── infrastructure/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
└── README.md
```

---

# 🗃️ Database

The repository contains a reproducible Prisma migration and seed workflow.

The local database can be recreated with:

```bash
docker compose down -v
docker compose up -d

pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

The migration system is part of the repository rather than relying on an already-initialized database.

---

# 🔐 Data & Configuration Principles

RecoverAI separates:

### Secrets

Credentials and sensitive keys.

### Configuration

Timeouts, limits, provider settings.

### Feature Flags

Controlled rollout and emergency behaviour.

### Policies

Business rules and action limits.

Sensitive configuration should never be hardcoded into the frontend.

---

# 🧱 Reliability Invariants

The platform is designed around several important correctness rules.

### Invariant 1

A recovery cannot be marked recovered unless payment verification confirms the resulting state.

### Invariant 2

Duplicate webhook delivery must not produce duplicate financial actions.

### Invariant 3

A policy-blocked action cannot execute through another application path.

### Invariant 4

A user cannot access another organization's recovery data.

### Invariant 5

Sensitive actions may require approval from a separate reviewer.

### Invariant 6

Local payment state can be corrected through reconciliation when it diverges from provider state.

---

# 📋 Operational Capabilities

The project includes operational interfaces for:

- recovery monitoring
- approval management
- audit inspection
- webhook inspection
- reconciliation monitoring
- system health
- simulation
- chaos testing

The Ops console is intended to be an **internal operational surface**, not a public customer interface.

---

# 🧭 Why These Architectural Choices?

## Why a modular monolith?

The project keeps clear domain boundaries without adding distributed-system complexity that isn't justified by the project scope.

## Why a single AI orchestrator?

A single bounded orchestrator is easier to test, secure, observe, and evaluate than several LLM agents communicating unpredictably.

## Why deterministic policies?

Financial constraints should be explicit, testable, auditable, and enforceable without depending on model behaviour.

## Why asynchronous workers?

Webhook acknowledgement should not wait for an LLM request, notification delivery, or a long-running recovery workflow.

## Why reconciliation?

Payment systems are asynchronous and local state can temporarily diverge from provider state.

---

# 📚 Documentation

### Architecture

- [Technical Specification](docs/architecture/technical-specification.md)
- [Architectural Decision Records](docs/adr/ADR-001-to-010.md)

### Evidence

- [Final Submission Audit](docs/evidence/final-submission-audit.md)
- [Test Results](docs/evidence/test-results.md)
- [AI Evaluation Results](docs/evidence/ai-evaluation-results.md)
- [Security Test Results](docs/evidence/security-test-results.md)
- [Load Test Results](docs/evidence/load-test-results.md)
- [Reconciliation Demo](docs/evidence/reconciliation-demo.md)
- [Incident Drill](docs/evidence/incident-drill.md)

### Operations

- [Incident Runbooks](docs/runbooks/INCIDENT-RUNBOOKS.md)

### Presentation

- [5-Minute Video Pitch Script](docs/presentation/5-minute-video-script.md)
- [Submission Form Answers](docs/presentation/submission-form-answers.md)

---

# ⚠️ Scope & Limitations

RecoverAI is a **project/demo implementation using Razorpay Test Mode**.

It is not presented as:

- a live-money payment processor
- a formal PCI certification
- a formal OWASP certification
- a contractual SLA
- a guarantee of universal AI accuracy
- a production system handling real customer traffic at the demonstrated benchmark

The project demonstrates production-oriented engineering principles around:

**fintech workflows + AI safety + reliability + security + observability + payment operations.**

---

# 🚀 Project Status

RecoverAI is implemented as a working Razorpay Test Mode demonstration platform.

The repository includes:

- Autonomous recovery workflow
- AI-assisted strategy recommendation
- Deterministic policy enforcement
- Maker-checker approval flow
- Razorpay webhook verification and idempotency
- Automated reconciliation
- Audit logging
- Distributed tracing
- Synthetic simulation and chaos testing
- Security and red-team tests
- AI golden evaluation
- Load-testing infrastructure
- Reproducible database migrations and seed data

**The 5-minute product walkthrough has been recorded.**

---

# ⭐ The RecoverAI Principle

```text
                    ┌─────────────────────┐
                    │    AI PROPOSES      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ POLICIES AUTHORIZE  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  EXECUTORS ACT      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ VERIFICATION CONFIRMS│
                    └─────────────────────┘
```

**RecoverAI is not an LLM with payment access.**

It is a payment recovery system with a **bounded AI decision layer**.
