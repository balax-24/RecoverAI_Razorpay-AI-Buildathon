# RecoverAI — Master Technical Specification & Architecture Contract
**Autonomous Revenue Recovery & Payment Operations Platform**
*Document Version: 1.0.0 (Comprehensive Engineering & Architecture Specification)*
*Classification: Architecture & Engineering Standard*
*Security Baseline: OWASP ASVS 5.0.0 Level 2 Alignment / Fintech Security Patterns*

---

# 1. Product Definition & Mission

## **RecoverAI**
**Autonomous Revenue Recovery & Payment Operations Platform**

The platform receives payment events, builds a recovery case, evaluates context, allows an AI engine to recommend structured recovery actions, enforces deterministic policy rules, executes only authorized operations, verifies outcomes via Razorpay APIs, and records the entire lifecycle in an immutable audit log.

### The Core Architectural Execution Pipeline
```text
AI recommends
      ↓
Application validates
      ↓
Policy engine authorizes
      ↓
Action executor performs
      ↓
Payment system confirms
      ↓
Audit system records
      ↓
Observability explains
```
That is the authoritative architecture of RecoverAI.

---

# 2. What we are actually building

Not an Android app.
Not an AI chatbot.
Not just a dashboard.

We are building **one web platform with several specialized surfaces**:

```text
                    RecoverAI
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
 Merchant Web      Customer Web      Operations/Admin
 Dashboard         Recovery UI       Console
       │
       └───────────────┬────────────────┘
                       ▼
                 API Platform
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
      PostgreSQL     Redis          Object
                                    Storage
          │            │
          │            ▼
          │         Workers
          │            │
          └────────────┼─────────────┐
                       ▼             │
                Recovery Engine      │
                       │             │
            ┌──────────┼──────────┐  │
            ▼          ▼          ▼  │
           AI       Policy      Risk │
         Engine     Engine      Guard│
            │          │          │  │
            └──────────┼──────────┘  │
                       ▼             │
                 Action Executor     │
                       │             │
              ┌────────┼────────┐    │
              ▼        ▼        ▼    │
          Razorpay  Notifications  Human
          APIs      / Messaging    Approval
              │
              ▼
          Verification
              │
              ▼
         Audit + Events
              │
              ▼
     Logs / Metrics / Traces
```

---

# 3. Architecture principle: modular monolith

We do not build 20 uncoordinated microservices. We build a structured **Modular Monolith** in TypeScript:

### Application Layer
```text
web      # Next.js Merchant Dashboard & Customer Recovery Page
api      # NestJS Core REST Gateway & Webhook Ingestion Engine
worker   # NestJS BullMQ Async Processing Worker & Outbox Poller
ops      # Internal Chaos, Simulation & Admin Console
```

### Domain Modules
```text
identity         # Users, password hashing, sessions, TOTP MFA
organizations    # Multi-tenant boundary & merchant credentials
customers        # Customer profiles, LTV, risk scores
payments         # Razorpay orders, payments, checkout verification
orders           # Cart orders & invoice tracking
recovery         # Recovery cases, actions, state machine transitions
agents           # Single orchestrator LLM, context builder, prompt runner
policies         # Deterministic policy engine & rules DSL evaluator
approvals        # Maker-checker dual-authorization workflows
notifications    # Multi-channel notification templates & outbox
audit            # Immutable compliance audit log ledger
webhooks         # Raw HMAC validation, ledger & deduplication
analytics        # Real-time KPIs, funnels & strategy rollups
```

### Infrastructure Adapters
```text
postgres         # Prisma client extension with tenant scoping
redis            # Redis connection manager & BullMQ queues
razorpay         # Razorpay SDK adapter (Test Mode: rzp_test_)
email            # SMTP / MailHog adapter (Simulated for demo)
llm              # Gemini / OpenAI provider abstraction
observability    # OpenTelemetry SDK tracer, metrics, Pino logger
storage          # S3 / MinIO adapter for audit archives
```
This architecture allows splitting into distinct services in the future without rewriting the core domain logic.

---

# 4. Repository architecture

```text
recoverai/
│
├── apps/
│   ├── web/
│   ├── api/
│   ├── worker/
│   └── ops/
│
├── packages/
│   ├── config/
│   ├── database/
│   ├── domain/
│   ├── shared/
│   ├── validation/
│   ├── auth/
│   ├── payments/
│   ├── recovery/
│   ├── ai/
│   ├── policies/
│   ├── notifications/
│   ├── audit/
│   ├── observability/
│   └── security/
│
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   ├── monitoring/
│   └── scripts/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── contract/
│   ├── security/
│   ├── load/
│   └── ai-evals/
│
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── security/
│   ├── operations/
│   ├── ai/
│   ├── api/
│   ├── database/
│   ├── runbooks/
│   ├── adr/
│   └── threat-model/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── .env.example
├── README.md
└── LICENSE
```

---

# 5. Frontend architecture

## Merchant Application (Next.js + TypeScript)
The UI route structure is explicitly organized under `apps/web/app/`:

```text
app/
├── (auth)/
│   ├── login/
│   ├── onboarding/
│   └── mfa/
├── (dashboard)/
│   ├── dashboard/
│   ├── payments/
│   ├── customers/
│   ├── recoveries/
│   ├── approvals/
│   ├── agents/
│   ├── policies/
│   ├── webhooks/
│   ├── audit/
│   ├── observability/
│   ├── simulations/
│   └── settings/
└── (public)/
    └── r/[token]/
```

---

# 6. Frontend state management

To ensure clean architecture and avoid unstructured fetch sprawling:
- **Server State**: Managed exclusively with **TanStack Query (React Query)** with clear cache invalidation keys (`['recoveries', id]`, `['analytics', timeRange]`).
- **UI State**: Local component state (React hooks).
- **Form Validation**: Strict schema validation with **Zod** and `react-hook-form`.
- **Centralized Auth**: Session state handling with HttpOnly cookie tokens.
- **Resilience**: React Error Boundaries and tailored loading skeleton states.
- **Optimistic UI Rules**: Safe optimistic UI only where appropriate. **Money-related operations (payments, approvals, retries, refunds) MUST NOT use optimistic UI** that could imply success before backend confirmation.

---

# 7. Frontend security

The browser is treated as an **untrusted environment**.
Never rely on client-side conditional checks like `if (user.role === "admin") { showButton() }` as a security boundary.

The backend independently authorizes every request (e.g. `POST /api/v1/policies/:id`). The frontend strictly controls visual presentation.
The platform adopts **OWASP ASVS 5.0.0 Level 2** as its formal verification baseline.

---

# 8. Customer recovery page

The customer recovery interface has its own dedicated, high-security model:
- **Route**: `https://recoverai.com/r/abc123` (Opaque, unguessable token).
- **Strictly Prohibited**: Direct resource routes like `/recovery/customer/12345`.
- **Token Characteristics**:
  - Cryptographically random (`crypto.randomBytes(32).toString('hex')`).
  - Stored as SHA-256 hash in the database.
  - Expiring (default 48-hour validity).
  - Single-use upon completed payment.
  - Revocable by merchant at any time.
  - Returns minimal data (amount, currency, merchant name, masked customer identity); never reveals internal database IDs or risk scores.

---

# 9. API gateway layer

Every incoming API request passes through a strict sequential filter pipeline:

```text
Internet
   ↓
TLS Termination
   ↓
WAF / Reverse Proxy
   ↓
Rate Limiter (IP / User / Organization)
   ↓
Request ID & Trace Context (X-Request-Id, traceparent)
   ↓
Authentication Guard (Session verification)
   ↓
Authorization Guard (RBAC)
   ↓
Tenant Isolation Interceptor (organization_id scoping)
   ↓
Validation Pipe (Zod schema checking)
   ↓
Controller
```

---

# 10. Authentication

For the merchant web dashboard:
- **Primary Auth**: Secure, session-based authentication using HttpOnly, SameSite cookies.
- **Credentials**: Email/Password with Argon2id hashing and unique per-user salts.
- **Identity Providers**: OAuth 2.0 / OIDC support.
- **Privileged Roles**: TOTP-based Multi-Factor Authentication (MFA) is **mandatory** for `ADMIN` and `OWNER` roles.

---

# 11. Session security

Session tokens must enforce:
- Flags: `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/api`.
- Expiration: Sliding 2-hour idle timeout, 24-hour absolute maximum lifetime.
- Rotation: Automatic session token rotation upon login or privilege change.
- Revocation:
  - Single session logout.
  - Instant revocation of all active sessions (`Revoke All Sessions`).
  - Session activity logging (IP address, user agent, last active timestamp).

---

# 12. Authorization

RBAC alone is insufficient for multi-tenant fintech platforms. RecoverAI enforces:

### Role-Based Access Control (RBAC)
```text
OWNER      # Full organizational control, billing, key rotation, Safe Mode toggle
ADMIN      # Policy modification, user management, Maker-Checker high-risk approval
OPERATOR   # Manual retries, payment link creation, customer case inspection
ANALYST    # Read-only access to analytics, audit logs, and recovery metrics
VIEWER     # Read-only dashboard viewer
```

### Organization Isolation
Every query and database record is explicitly scoped by `organization_id`. A user from `Org A` can never access or modify resources belonging to `Org B`.

---

# 13. Object-level authorization

To prevent Insecure Direct Object References (IDOR):
A request like `GET /api/v1/recoveries/rec_123` does not simply verify that the user is authenticated. It strictly checks:
$$\text{Does } rec\_123 \text{ belong to } req.user.organization\_id\text{?}$$
If not, the system returns `404 Not Found` (or `403 Forbidden`) without leaking resource existence.

---

# 14. Database tenancy

Every tenant-owned entity in the schema contains an explicit `organization_id` foreign key column:
- `customers`
- `orders`
- `payments`
- `recovery_cases`
- `recovery_actions`
- `policies`
- `approvals`
- `audit_events`
- `notification_outbox`

The service layer and Prisma client extension systematically inject `where: { organizationId }` into all read/write queries.

---

# 15. Database security

PostgreSQL is hardened with production standards:
- **TLS In-Transit**: Enforced SSL connections (`sslmode=require`).
- **Encrypted Storage**: Managed volume encryption at rest (AES-256).
- **Least-Privilege DB User**: Application runtime connects using a user with restricted DML permissions (no `DROP TABLE` / `CREATE EXTENSION` rights).
- **Separate Migration Credentials**: DDL migrations run in CI with elevated, isolated credentials.
- **Connection Pooling**: Managed pooling (PgBouncer / Prisma connection limits) preventing exhaustion.
- **Prepared Statements**: Parameterized queries preventing SQL injection.
- **Row-Level Security (RLS)**: Database-level tenant isolation defense-in-depth.

---

# 16. Secrets management

- **Local Development**: `.env` (excluded from git via `.gitignore`).
- **Staging / Production**: Cloud secret store (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault). Never upload raw `.env` files to servers.
- **Stored Secrets**:
  - Razorpay Key Secret
  - Razorpay Webhook Secret
  - LLM API Keys (Gemini / OpenAI)
  - PostgreSQL Database Credentials
  - Redis Connection Secret
  - Session Encryption Secret (32-byte hex)
  - Data-at-Rest Encryption Keys (AES-256-GCM)
- **Key Rotation**: Documented automated rotation runbooks; webhook secrets and API keys can be dual-active during rotation windows.

---

# 17. Encryption

- **In Transit**: TLS 1.3 / HTTPS across all HTTP, WebSocket, database, and Redis connections.
- **At Rest**: Managed storage volume encryption (AES-256).
- **Application Field Encryption**: Sensitive database columns (e.g. `razorpay_secret_enc`, `webhook_secret_enc`, `mfa_secret_enc`) are encrypted using **AES-256-GCM** with authenticated data headers before write operations.
- **Selective Indexing**: Non-sensitive searchable keys (like IDs and external hashes) remain unencrypted to avoid performance degradation while preserving security.

---

# 18. Data classification

| Data Level | Definition | Examples | Handling Policy |
|---|---|---|---|
| **PUBLIC** | Freely sharable | Public documentation, merchant brand name | Standard caching allowed |
| **INTERNAL** | Aggregated merchant metrics | Daily recovery totals, recovery conversion rates | Session auth required |
| **CONFIDENTIAL** | Merchant & customer identity | Customer email, phone, recovery links, case logs | Scoped tenancy, masked in logs |
| **SENSITIVE** | Security secrets | Razorpay secrets, webhook keys, session secrets | AES-256-GCM in DB, KMS in prod |
| **PROHIBITED** | Cardholder raw data | Card PAN numbers, CVV codes, bank PINs | **NEVER STORED OR PROCESSED** |

---

# 19. PCI scope minimization

RecoverAI deliberately **does not handle raw cardholder data**:
- Card numbers, CVVs, and expiry dates are entered directly into Razorpay hosted elements/checkout.
- RecoverAI only stores non-sensitive transaction tokens and metadata:
  - `razorpay_payment_id` (`pay_xxx`)
  - `razorpay_order_id` (`order_xxx`)
  - `amount` (INR)
  - `status` (`captured`, `failed`)
  - `method` (`upi`, `card`, `netbanking`)
  - `error_code` / `error_description`
This eliminates PCI-DSS Level 1 audit burdens and drastically minimizes attack surfaces.

---

# 20. Payment domain

Arbitrary application modules are prohibited from modifying payment state directly. All payment lifecycle mutations are encapsulated within a dedicated `PaymentService`:

### `PaymentService` Responsibilities
```typescript
export interface IPaymentService {
  createOrder(dto: CreateOrderDto): Promise<Order>;
  createCheckoutConfiguration(orderId: string): Promise<CheckoutConfig>;
  fetchPayment(paymentId: string): Promise<GatewayPaymentDetails>;
  verifyPaymentSignature(params: VerifySignatureDto): Promise<boolean>;
  createAllowedPaymentActions(caseId: string): Promise<AllowedActions>;
}
```

---

# 21. Razorpay integration boundary

The AI Recovery Agent is **never allowed** to directly call the Razorpay SDK or payment APIs:

```text
RecoveryAgent
      ↓
Proposed Action (Structured Data)
      ↓
PaymentService (Domain Logic & Validations)
      ↓
RazorpayAdapter (Cryptographic & HTTP Client)
      ↓
Razorpay Test Mode API
```
This guarantees that the AI has zero payment credentials and cannot bypass application business rules or deterministic policies.

---

# 22. Webhook architecture

Razorpay webhooks are asynchronous, can arrive duplicated, and may arrive out of order.
The webhook endpoint executes in **< 25ms**:

```text
POST /api/v1/webhooks/razorpay

1. Receive raw UTF-8 body
2. Validate payload size (< 1MB)
3. Verify HMAC SHA-256 signature
4. Extract event ID (event_xxx)
5. Persist raw event in `webhook_events` table
6. Detect duplicates via UNIQUE(provider, provider_event_id)
7. Create BullMQ asynchronous processing job
8. Return 200 OK {"received": true, "eventId": "..."}
```
**No LLM calls, no heavy business workflows, and no external API blocking inside the webhook request.**

---

# 23. Raw webhook body

Razorpay webhook signature verification depends strictly on the exact, unaltered raw request body Buffer. Re-encoding JSON alters whitespace and breaks the HMAC hash.
- **Implementation**: The NestJS framework is configured with a raw-body buffer parser for `/api/v1/webhooks/razorpay`, preserving `req.rawBody` prior to JSON deserialization.

---

# 24. Webhook event ledger

Table `webhook_events`:
- `id`: UUID (Primary Key)
- `provider`: `razorpay` (VarChar)
- `provider_event_id`: e.g. `event_L6jF2...` (VarChar, Indexed)
- `event_type`: e.g. `payment.failed`, `payment.captured` (VarChar)
- `received_at`: Timestamp
- `signature_valid`: Boolean
- `payload_hash`: SHA-256 string (64 chars)
- `raw_payload`: JSONB
- `processing_status`: `RECEIVED`, `VALIDATED`, `ENQUEUED`, `PROCESSED`, `DUPLICATE`, `FAILED`, `DEAD_LETTER`
- `processing_attempts`: Integer (default 0)
- `first_processed_at`: Timestamp
- `last_processed_at`: Timestamp
- `trace_id`: OpenTelemetry Trace ID
- **Unique Constraint**: `UNIQUE(provider, provider_event_id)`

---

# 25. Event ordering

Network latency can cause events to arrive out of order (e.g. `payment.captured` arriving before `payment.authorized`, or late `payment.failed` after success).

### Handler State Comparison Formula
$$\text{Target State} = f(\text{Current Known State}, \text{Incoming Event}, \text{Event Timestamp/Version})$$
- If current payment state is `CAPTURED`, an incoming delayed `payment.failed` event is marked `STALE_EVENT_DROPPED` and does not revert the transaction.
- If current state is `FAILED` and `payment.captured` arrives, state converges safely to `CAPTURED`, marking the recovery case as `RECOVERED`.

---

# 26. Payment state machine

```text
       [CREATED]
        │     │
   ┌────┘     └────┐
   ▼               ▼
[AUTHORIZED]   [FAILED]
   │
   ▼
[CAPTURED] (Terminal Success)
   │
   ▼
[REFUNDED]
```

### State Machine Rules
- **Legal Transitions**: `CREATED` $\rightarrow$ `AUTHORIZED` $\rightarrow$ `CAPTURED`; `CREATED` $\rightarrow$ `FAILED`; `FAILED` $\rightarrow$ `CAPTURED` (via recovery); `CAPTURED` $\rightarrow$ `REFUNDED`.
- **Stale Event Detection**: Events with timestamps older than current state update are ignored.
- **Terminal States**: `CAPTURED` and `REFUNDED` are terminal.

---

# 27. Reconciliation engine

If webhooks are lost or network partitions occur, the system cannot permanently trust its local database state alone.

### Periodic Reconciliation Architecture
- **Cron Job**: Runs every 30 minutes in BullMQ worker.
- **Comparison**: Queries payments in `PENDING` or `FAILED` state against Razorpay API (`GET /v1/payments/:id`).
- **Discrepancy Resolution**:
  ```text
  If DB == FAILED and Razorpay == CAPTURED:
    1. Log Reconciliation Log (MISMATCH_DETECTED)
    2. Auto-repair DB state to CAPTURED
    3. Transition RecoveryCase to RECOVERED
    4. Emit Audit Event (RECONCILED_AUTOMATICALLY)
  ```

---

# 28. Recovery domain

A **recovery case** is an independent domain entity tracking the end-to-end lifecycle of recovering failed revenue.

### `RecoveryCase` Entity Schema
- `id`: UUID
- `organization_id`: UUID (Tenant scope)
- `customer_id`: UUID
- `payment_id`: UUID
- `amount_at_risk`: Decimal(12, 2)
- `currency`: INR
- `reason_code`: e.g. `BAD_REQUEST_PAYMENT_DECLINED`, `GATEWAY_ERROR`
- `priority_score`: Integer (1–100 based on LTV and recovery likelihood)
- `status`: `RecoveryStatus` Enum
- `risk_level`: `LOW`, `MEDIUM`, `HIGH`
- `current_strategy`: `RecoveryActionType` Enum
- `attempt_count`: Integer
- `max_allowed_attempts`: Integer (default 3)
- `next_action_at`: Timestamp
- `expires_at`: Timestamp (default failure + 72 hours)
- `created_at`: Timestamp
- `updated_at`: Timestamp

---

# 29. Recovery actions

Table `recovery_actions` preserves an append-only, immutable history of every attempt:
- `id`: UUID
- `recovery_case_id`: UUID
- `action_type`: `SMART_RETRY`, `PAYMENT_LINK`, `CUSTOMER_MESSAGING`, `INCENTIVE_OFFER`, `MANUAL_INTERVENTION`
- `requested_by`: `AI_AGENT`, `USER`, `SYSTEM`
- `requested_at`: Timestamp
- `policy_decision`: `ALLOW`, `BLOCK`, `APPROVAL_REQUIRED`
- `execution_status`: `SCHEDULED`, `EXECUTING`, `SUCCESS`, `FAILED`, `SKIPPED`, `REJECTED`
- `idempotency_key`: Unique string
- `provider_reference`: e.g. Razorpay Payment Link ID (`plink_xxx`)
- `action_payload`: JSONB (discount amount, scheduled time, channel)
- `execution_result`: JSONB
- `completed_at`: Timestamp
- `error_code`: String

---

# 30. Immutable audit history

The platform **never overwrites** decision state in place.
Instead of updating `"decision": "RETRY"` to `"decision": "PAYMENT_LINK"`, the system appends discrete decision records:
$$\text{Decision 1 (Attempt 1)} = \text{SMART\_RETRY} \longrightarrow \text{Decision 2 (Attempt 2)} = \text{PAYMENT\_LINK}$$
This enables complete historical reconstruction of how every rupee was recovered.

---

# 31. Audit event structure

Table `audit_events`:
- `id`: UUID
- `organization_id`: UUID
- `actor_type`: `USER`, `AI_AGENT`, `SYSTEM`, `WEBHOOK`, `WORKER`, `ADMIN`
- `actor_id`: UUID (User ID or Agent Identifier)
- `action`: e.g. `recovery.action_executed`, `policy.updated`, `approval.granted`
- `resource_type`: `recovery_case`, `payment`, `policy`, `webhook`
- `resource_id`: String
- `reason_code`: String
- `policy_id`: UUID
- `request_id`: String
- `trace_id`: String (OpenTelemetry)
- `ip_address`: String
- `previous_state`: JSONB
- `new_state`: JSONB
- `metadata`: JSONB
- `timestamp`: Timestamp

---

# 32. AI architecture — single orchestrator

Rather than building 5 independent LLM agents chatting with one another (which increases latency, cost, and non-deterministic failures), RecoverAI employs **One Strong Recovery Orchestrator** with specialized functional capabilities:
- `Context Builder`: Compiles bounded data summaries.
- `Strategy Evaluator`: Evaluates failure patterns and recommends recovery actions.
- `Communication Generator`: Fills pre-approved templates with customer variables.

**Benefits**: < 1500ms latency, lower token cost, deterministic debugging, and reliable unit testing.

---

# 33. AI decision pipeline

```text
Recovery Case
      ↓
Context Builder (Sanitized bounded snapshot)
      ↓
LLM Orchestrator (Structured prompt with schema)
      ↓
Structured Recommendation (Zod parsed JSON)
      ↓
Schema Validator (Validates types, ranges, enums)
      ↓
Risk Validator (Detects anomalies & high values)
      ↓
Policy Engine (Applies merchant rules & caps)
      ↓
Approval / Execution Router
```

---

# 34. Context builder

The context builder compiles a **bounded context** without dumping raw database rows or PII into prompts:

```typescript
export interface BoundedRecoveryContext {
  caseId: string;
  amountInr: number;
  currency: string;
  failureReason: string;
  failureCategory: 'TEMPORARY_NETWORK' | 'INSUFFICIENT_FUNDS' | 'AUTHENTICATION' | 'PERMANENT_REJECT';
  attemptCount: number;
  customerLtvTier: 'STANDARD' | 'VALUED' | 'VIP';
  hoursSinceFailure: number;
  merchantPolicySummary: {
    maxRetries: number;
    maxDiscountInr: number;
    canOfferIncentive: boolean;
  };
}
```

---

# 35. AI tool sandbox

Tools available to the orchestrator are explicit, sandboxed, and schema-validated:

### READ Tools
- `get_payment_details(payment_id)`
- `get_customer_summary(customer_id)`
- `get_recovery_history(recovery_case_id)`

### DECISION Tools
- `calculate_recovery_score(factors)`

### ACTION Tools
- `create_payment_link(amount, expiry_hours)`
- `schedule_retry(delay_hours)`
- `send_customer_message(template_key, channel)`

### HIGH-RISK Tools (Require Human Approval)
- `apply_discount_incentive(discount_inr)`
- `initiate_refund(payment_id, reason)`

---

# 36. Tool-call authorization

Before any tool executes, the **Tool Authorization Layer** verifies:
1. **Actor Identity**: Who requested the tool?
2. **Organization Boundary**: Does the target resource belong to `req.user.organization_id`?
3. **Tool Whitelist**: Is this tool enabled for this merchant?
4. **Policy Limits**: Does the tool argument violate policy caps (e.g. discount > ₹100)?
5. **Maker-Checker Check**: Does this tool require dual-authorization?

---

# 37. Prompt injection defense

Customer-provided strings (notes, names) are demarcated with strict boundary markers:
```text
=== BEGIN UNTRUSTED CUSTOMER DATA ===
Customer Note: "${sanitizedCustomerNote}"
=== END UNTRUSTED CUSTOMER DATA ===
```
**Safety Invariant**: The LLM prompt explicitly instructs the model that content within untrusted data tags must never be interpreted as system instructions. Even if an injection succeeds, the downstream **Deterministic Policy Engine** blocks any unpermitted financial operations.

---

# 38. Output validation

The AI model must respond with strict structured JSON:

```json
{
  "decision": "SEND_PAYMENT_LINK",
  "reason_code": "TEMPORARY_FAILURE",
  "confidence": 0.91,
  "requires_approval": false,
  "parameters": {
    "delayHours": 0,
    "discountInr": 0,
    "messageChannel": "EMAIL"
  }
}
```
The output passes through:
1. JSON parser
2. Zod schema validation (`AiRecommendationSchema`)
3. Enum whitelist verification
4. Policy bounds check
If any validation fails, the output is flagged as `AI_INVALID_OUTPUT` and routed to the Fallback Engine.

---

# 39. AI model governance

Every decision records telemetry in `ai_decision_logs`:
- `provider`: `gemini` / `openai`
- `model_name`: `gemini-1.5-pro` / `gpt-4o`
- `model_version`: `2026-08-01`
- `prompt_version`: `v1.2.0`
- `request_id`: `req_xxx`
- `latency_ms`: e.g. 412
- `input_tokens`: e.g. 520
- `output_tokens`: e.g. 85
- `estimated_cost_usd`: Decimal
- `is_fallback_used`: Boolean
- `fallback_reason`: String

---

# 40. AI safety budget

Each recovery case is constrained by strict safety budgets:
- Max AI Invocations: $\le 3$ calls per case
- Max Tool Executions: $\le 8$ tools per case
- Max Execution Latency: $1500\text{ ms}$ per call
- Max Retries: $\le 3$ payment retries
- Max Incentive: $\le \text{Policy Max Discount}$
When any budget is exhausted, the system transitions the case to `ESCALATE` / `MANUAL_INTERVENTION`.

---

# 41. Deterministic fallback engine

If the AI engine is unreachable, times out, or returns invalid schemas, the **Deterministic Fallback Engine** takes over instantaneously:

```typescript
export function executeDeterministicFallback(context: BoundedRecoveryContext): AiRecommendation {
  if (context.failureCategory === 'TEMPORARY_NETWORK' && context.attemptCount < 2) {
    return {
      recommendedAction: 'SMART_RETRY',
      confidenceScore: 0.85,
      reasoningSummary: 'Fallback rule: Temporary network glitch with attempts remaining',
      parameters: { delayHours: 1, discountInr: 0 },
      requiresHumanReview: false
    };
  }
  if (context.failureCategory === 'INSUFFICIENT_FUNDS' || context.attemptCount >= 2) {
    return {
      recommendedAction: 'PAYMENT_LINK',
      confidenceScore: 0.90,
      reasoningSummary: 'Fallback rule: Customer action required via alternative payment link',
      parameters: { delayHours: 0, discountInr: 0, messageChannel: 'EMAIL' },
      requiresHumanReview: false
    };
  }
  return {
    recommendedAction: 'MANUAL_INTERVENTION',
    confidenceScore: 0.70,
    reasoningSummary: 'Fallback rule: High risk or unclassified error; flagged for review',
    parameters: { delayHours: 0, discountInr: 0 },
    requiresHumanReview: true
  };
}
```

---

# 42. Policy engine

The Policy Engine is a first-class deterministic module governing all system actions:
- `id`: UUID
- `name`: String (e.g. "Standard Subscription Recovery Policy")
- `version`: Integer (e.g. 1, 2)
- `scope`: `ORGANIZATION`
- `priority`: Integer
- `rules_dsl`: JSONB
- `max_retry_attempts`: Integer (e.g. 3)
- `max_discount_inr`: Decimal (e.g. ₹100.00)
- `min_interval_hours`: Integer (e.g. 6 hours)
- `high_value_threshold`: Decimal (e.g. ₹10,000.00)
- `requires_human_review`: Boolean
- `is_active`: Boolean

---

# 43. Policy evaluation result

Every policy evaluation emits a structured audit payload:

```json
{
  "decision": "BLOCK",
  "policy_id": "pol_982f1b",
  "violated_rules": ["DISCOUNT_EXCEEDS_POLICY_MAX"],
  "reason": "Proposed incentive ₹250 exceeds maximum allowable discount of ₹100",
  "applied_limits": {
    "max_retries": 3,
    "max_discount_inr": 100,
    "cooldown_hours": 6
  }
}
```
This output is written directly to `audit_events`.

---

# 44. Human approval system

Approvals are modeled as a formal business state workflow:

```text
REQUESTED
   ↓
PENDING_REVIEW
   ↓
APPROVED / REJECTED
   ↓
EXPIRED
```
Every approval record captures: `reviewed_by_id`, `reviewed_at`, `review_notes`, `previous_value`, `requested_action`, and `approved_action`.

---

# 45. Maker-checker principle

For high-risk operations (refunds, large discounts, overrides, repeatedly failed high-value accounts):
- The AI (or an operator) acts as the **Maker** (proposes action).
- A distinct user with `ADMIN` or `OWNER` role must act as the **Checker** (authorizes action).
- **Rule**: `approval.reviewed_by_id != approval.requested_by_id`.

---

# 46. Notification architecture

The notification system uses an extensible provider adapter model:
- `NotificationService`: Core domain orchestrator.
- `EmailProvider`: Simulated for demo via MailHog / SMTP.
- `SMSProvider`: Simulated SMS dispatch.
- `WhatsAppProvider`: Simulated WhatsApp business messaging.
- `InAppProvider`: Real in-app alerts on the merchant dashboard.

---

# 47. Notification outbox

To solve the dual-write consistency problem:
```text
DB Transaction
  ├── Update Recovery Case & Action Record
  ├── Insert Immutable Audit Record
  └── Insert Notification Payload in `notification_outbox`

Outbox Worker
  ↓ Polls pending messages
  ↓ Sends via Channel Adapter
  ↓ Updates `is_sent = true` and `sent_at = now()`
```
If the external notification provider fails, the transaction is not rolled back; the outbox worker retries with exponential backoff.

---

# 48. Idempotency everywhere

Every mutative REST API endpoint and background job accepts and validates an `Idempotency-Key` header:
- `POST /api/v1/recoveries/:id/retry` $\rightarrow$ `Idempotency-Key: rec-abc-retry-2`
- `POST /api/v1/recoveries/:id/link` $\rightarrow$ `Idempotency-Key: rec-abc-link-1`
Repeated calls with identical keys return the original cached response without re-executing payment gateway calls or duplicate messaging.

---

# 49. Distributed locking

- Redis distributed locks (`ioredis` / Redlock pattern) are used strictly for coordination (e.g. preventing two workers from evaluating the same `recovery:rec_123` simultaneously).
- **True Correctness Guarantee**: Database unique constraints and state transition guards remain the authoritative correctness mechanism.

---

# 50. Queue architecture

RecoverAI isolates workloads across **7 dedicated BullMQ queues**:
1. `webhooks`: Ingestion & HMAC verification.
2. `recovery`: Recovery case state evaluations.
3. `ai`: LLM orchestrator decision calls.
4. `payments`: Razorpay API orders & link generation.
5. `notifications`: Outbox message delivery.
6. `reconciliation`: Gateway state sync & mismatch repair.
7. `analytics`: Hourly metrics rollups.

---

# 51. Queue policies

| Queue Name | Concurrency | Max Retries | Backoff Strategy | Dead-Letter Queue |
|---|---|---|---|---|
| `webhooks` | 10 | 3 | Exponential (2s, 4s, 8s) | `webhooks-dlq` |
| `recovery` | 5 | 3 | Exponential (5s, 15s, 45s)| `recovery-dlq` |
| `ai` | 4 | 2 | Fixed (2s) | `ai-dlq` |
| `notifications` | 5 | 5 | Exponential (10s, 30s, 60s)| `notifications-dlq` |
| `reconciliation`| 2 | 3 | Fixed (30s) | `reconciliation-dlq` |
| `analytics` | 2 | 2 | Fixed (10s) | `analytics-dlq` |

---

# 52. Poison messages

Malformed payloads or permanent downstream failures are capped at 3 retries, then automatically routed to the Dead-Letter Queue (DLQ).
The **Operations Console** provides DLQ monitoring with tools to:
- `Inspect`: View failure stack trace and payload.
- `Replay`: Re-enqueue job after fixing underlying issue.
- `Discard`: Purge poisoned job with audit log entry.

---

# 53. Worker graceful shutdown

Workers capture `SIGTERM` and `SIGINT` signals:
```text
SIGTERM Received
   ↓
Stop polling BullMQ queues
   ↓
Wait for active in-flight jobs to complete (timeout: 10s)
   ↓
Close PostgreSQL pool and Redis connections cleanly
   ↓
Exit process (code 0)
```

---

# 54. Database migration safety

Production database migrations follow a backward-compatible zero-downtime procedure:
```text
CI Build
   ↓
Migration Compatibility Check (No destructive DROP/RENAME)
   ↓
Automated Snapshot Backup
   ↓
Apply Prisma Migrations (`prisma migrate deploy`)
   ↓
Health Check Verification
   ↓
Deploy Application Containers
```

---

# 55. Connection management

- PostgreSQL connection pooling is enforced via PgBouncer / Prisma connection limits.
- Worker tasks share a bounded pool (`connection_limit=20`) preventing connection spikes during high-concurrency webhook ingestion.
- Idle timeouts: 10,000ms. Connection timeout: 5,000ms.

---

# 56. API resilience

All external calls (Razorpay, LLM providers, email gateways) implement:
- Strict timeouts (LLM: 1500ms, Razorpay: 1000ms).
- Exponential backoff with full jitter for idempotent operations.
- Circuit breaker protection.
- OpenTelemetry span context propagation.

---

# 57. Circuit breaker

```text
Razorpay API
   ↓
5 Consecutive Timeouts / 5xx Errors
   ↓
Circuit State: OPEN (Immediately rejects calls with Fast Fallback)
   ↓ (After 30-second cooldown)
Circuit State: HALF-OPEN (Sends single test probe)
   ├── Success → Circuit State: CLOSED (Normal traffic resumes)
   └── Failure → Circuit State: OPEN (Restart 30s cooldown)
```

---

# 58. External API timeout budgets

Strict latency budgets prevent API thread starvation:
- Client Browser Request: Max 5,000ms
- API Ingestion Processing: Max 3,000ms
- LLM Decision Budget: Max 1,500ms
- Razorpay API Budget: Max 1,000ms
Any long-running task (> 500ms) is immediately offloaded to BullMQ queues.

---

# 59. Business SLA thinking

- **SLI (Service Level Indicator)**: What is measured (e.g. Webhook Ingestion Latency, Recovery Case Success Rate, API Error Rate).
- **SLO (Service Level Objective)**: Target reliability goal:
  - 99.9% of webhooks ingested & signature verified in $< 100\text{ ms}$.
  - 95% of recovery decisions evaluated in $< 1500\text{ ms}$.
  - 99.9% uptime on customer recovery payment pages.

---

# 60. Observability: full design

RecoverAI correlates three primary signals via OpenTelemetry:
- **Logs**: Structured JSON records of discrete events.
- **Metrics**: Quantitative Prometheus measurements (rates, latencies, counters).
- **Traces**: Distributed execution spans linking Webhook $\rightarrow$ API $\rightarrow$ Worker $\rightarrow$ AI $\rightarrow$ Gateway.

---

# 61. Request IDs & Context Propagation

Every incoming request generates or propagates:
- `request_id`: e.g. `req_9a2f1c` (Logged in HTTP responses as `X-Request-Id`).
- `trace_id`: 32-character hex string (W3C Trace Context).
- `span_id`: 16-character hex string.
These identifiers are attached to all Pino logs, BullMQ jobs, and audit events.

---

# 62. Structured logs

All logging is output as single-line Pino structured JSON:

```json
{
  "level": "error",
  "time": 1755860000000,
  "event": "payment_verification_failed",
  "payment_id": "pay_123",
  "organization_id": "org_1",
  "provider": "razorpay",
  "error_code": "TIMEOUT",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "req_id": "req_9a2f1c"
}
```

---

# 63. Sensitive log filtering

Pino log serializers automatically redact confidential fields:
- `req.headers.authorization`
- `req.headers["x-razorpay-signature"]`
- `*.password`
- `*.secret`
- `*.token`
- `*.mfaSecret`
- `*.cardNumber`
- `*.cvv`
- `*.rawCustomerNotes`

---

# 64. Log retention

- **Application Debug Logs**: 14 days retention.
- **Webhook Raw Payloads**: 30 days retention.
- **AI Decision Telemetry**: 90 days retention.
- **Security & Audit Logs**: 365 days retention in immutable storage.

---

# 65. Audit vs logs vs events

- **Application Logs**: Ephemeral debugging records for developers.
- **Domain Events**: Internal state signals orchestrating asynchronous workflows.
- **Audit Events**: Immutable compliance records explaining *who did what, why, and under which policy*.
- **Metrics**: Aggregated quantitative time-series data.
- **Traces**: End-to-end distributed latency and call trees.

---

# 66. Domain events

Standardized domain event catalog:
- `PaymentFailed`
- `RecoveryCreated`
- `StrategySelected`
- `PolicyEvaluated`
- `ActionApproved`
- `ActionExecuted`
- `PaymentRecovered`
- `RecoveryExhausted`

---

# 67. Pragmatic event strategy

RecoverAI uses a **Pragmatic Relational Model + Immutable Audit Ledger** rather than full Event Sourcing. State is queried from standard PostgreSQL relational tables, while auditability is guaranteed through append-only event logs.

---

# 68. Analytics layer

Hourly and daily aggregation workers compute business KPIs:
- Total Revenue at Risk (INR)
- Total Recovered Revenue (INR)
- Overall Recovery Conversion Rate (%)
- Average Time-to-Recovery (Hours/Minutes)
- Recovery Breakdown by Failure Reason (Network, Card Expired, Insufficient Funds)
- Recovery Breakdown by Strategy (Smart Retry, Payment Link, Incentive Offer)

---

# 69. Product analytics

Merchant engagement telemetry:
- `dashboard_opened`
- `recovery_case_viewed`
- `manual_retry_triggered`
- `approval_decided`
- `policy_created`
- `simulation_executed`
Sensitive customer information is strictly excluded from analytics events.

---

# 70. Cost analytics

For AI operations:
- Cost per recovery case (USD / INR)
- Average token usage per successful recovery
- LLM invocations per case
- Deterministic fallback rate (%)
- Demonstrates economic ROI of AI decisions vs rule-based fallbacks.

---

# 71. AI evaluation framework

Located in `tests/ai-evals/`, evaluating scenarios including:
- Temporary network timeouts
- Insufficient customer funds
- Expired card credentials
- Late bank authorizations
- Multiple previous retries
- High-value VIP transactions
- Duplicate webhooks
- Hostile prompt injection attempts

---

# 72. Evaluation dimensions

1. **Strategy Correctness**: Did it choose the optimal recovery path?
2. **Policy Compliance**: Did it respect discount and retry caps?
3. **Tool Selection**: Were only permitted tools requested?
4. **Unsafe Action Rate**: 0% tolerance for unpermitted refunds or excessive discounts.
5. **Format Validity**: 100% adherence to `AiRecommendationSchema`.
6. **Latency**: Sub-1500ms execution.
7. **Cost**: Under $0.005 per evaluation.

---

# 73. Golden dataset

A benchmark suite of 50 vetted failure cases with deterministic expected outcomes:
- `Scenario_001` (Temporary bank drop) $\rightarrow$ Expected: `SMART_RETRY`
- `Scenario_002` (Insufficient funds) $\rightarrow$ Expected: `PAYMENT_LINK`
- `Scenario_003` (VIP customer high-value failure) $\rightarrow$ Expected: `HUMAN_APPROVAL`

---

# 74. Model regression testing

Whenever system prompts, tools, model providers, or context builders are updated, the AI Evaluation Suite executes in CI. If benchmark accuracy drops below **90%**, CI fails and blocks deployment.

---

# 75. AI observability

Every orchestrator execution logs:
- `agent_run_id`: UUID
- `trace_id`: String
- `model`: e.g. `gemini-1.5-pro`
- `prompt_version`: `v1.2.0`
- `input_tokens`: Integer
- `output_tokens`: Integer
- `latency_ms`: Integer
- `decision`: String
- `confidence`: Decimal
- `policy_result`: String
- `fallback_used`: Boolean
- `cost_estimate_usd`: Decimal

---

# 76. AI confidence

Model confidence is treated as **model-reported score** (0.0 to 1.0) rather than mathematical certainty. Low confidence (< 0.70) triggers deterministic fallback or flags for human approval.

---

# 77. AI abuse controls

- Rate limits on AI calls per tenant.
- Max input context size: 4,000 tokens.
- Max execution time: 1,500ms hard cutoff.
- Max reasoning steps: 8 steps.

---

# 78. Agent loop protection

To prevent infinite tool recursion:
```text
Step Count > 8 → AGENT_BUDGET_EXCEEDED → Abort LLM → Execute Fallback Engine
```

---

# 79. Prompt & version registry

Prompts are stored as versioned templates in `packages/ai/prompts/` and table `prompt_registry` with:
- `prompt_key`: e.g. `recovery_orchestrator`
- `version`: e.g. `v1.2.0`
- `system_prompt`: Text
- `template_schema`: JSON
- `checksum`: SHA-256

---

# 80. Feature flags

Table `tenant_feature_flags` supports dynamic toggling without redeployment:
- `AI_RECOVERY_ENABLED`
- `FALLBACK_RULES_ENABLED`
- `INCENTIVE_STRATEGY_ENABLED`
- `NEW_POLICY_ENGINE`

---

# 81. Kill switches

Merchants and platform administrators have instantaneous kill switches:
- `GLOBAL_RECOVERY_AUTOMATION = OFF`
- Instantly halts automated payment links and retries; transitions incoming failed cases to `PENDING_REVIEW`.

---

# 82. Emergency mode (Safe Mode)

When `SAFE_MODE = true`:
- All automated financial mutations are blocked.
- No discounts or automatic retries are executed.
- All recovery actions require manual Human Approval.

---

# 83. Admin controls (Ops Console)

The Ops Console (`apps/ops`) provides:
- AI orchestrator toggle (Enabled / Fallback Only)
- Queue pause, resume, and flush
- DLQ inspection and single/batch replay
- Webhook raw replay
- Feature flag management
- System health and latency gauges

---

# 84. Incident management & runbooks

Located in `docs/runbooks/`:
1. `webhook-failure.md`
2. `database-outage.md`
3. `redis-outage.md`
4. `llm-outage.md`
5. `razorpay-outage.md`
6. `queue-backlog.md`
7. `secret-compromise.md`

### Standardized 7-Step Runbook Structure
1. Symptoms
2. Detection
3. Immediate Containment
4. Investigation
5. Recovery
6. Verification
7. Post-Incident Review

---

# 85. Alerting

Alert rules configured in Prometheus:
- Webhook signature error rate > 1%
- BullMQ queue lag > 500 jobs
- Dead-Letter Queue count > 0
- AI decision timeout rate > 5%
- Payment reconciliation mismatch detected
- API 5xx rate > 1%
- PostgreSQL connection pool saturation > 80%

---

# 86. Health dashboard

Real-time health status widget:
- API Platform: `HEALTHY` / `DEGRADED` / `CRITICAL`
- PostgreSQL Database: `HEALTHY`
- Redis & BullMQ Queues: `HEALTHY`
- AI Provider API: `HEALTHY`
- Razorpay Gateway: `HEALTHY`
- Ingestion Webhooks: `HEALTHY`

---

# 87. Security monitoring

Monitors and alerts on:
- Failed login attempts (> 5 in 5 min)
- Multi-tenancy isolation denials
- Suspicious recovery token reuse
- Webhook signature verification failures
- Rate limit threshold breaches
- Admin kill switch toggles

---

# 88. Security test suite (OWASP ASVS 5.0.0)

Automated security test suite in `tests/security/`:
- SQL Injection tests
- Cross-Site Scripting (XSS) tests
- Cross-Site Request Forgery (CSRF) tests
- Insecure Direct Object References (IDOR) tests
- Broken RBAC & Privilege Escalation tests
- Webhook Spoofing & Replay Attack tests
- AI Prompt Injection & Evasion tests

---

# 89. Dependency security

Automated CI scanning:
- `pnpm audit`
- Dependabot security updates
- Secret scanning (TruffleHog / Gitleaks)
- Open-source license compliance checks

---

# 90. Container security

Docker images follow hardening best practices:
- Base: `node:20-alpine` (Minimal attack surface)
- Non-root user: `USER node`
- Multi-stage builds with zero build tools in production images
- Read-only root filesystem where feasible
- Docker container health check probes

---

# 91. Infrastructure as Code (Terraform)

Terraform configurations in `infrastructure/terraform/`:
- PostgreSQL RDS provisioning with automated backups
- Managed Redis cluster
- VPC networking, private subnets, security groups
- Cloud secret references
- Monitoring alarms and alert topics

---

# 92. Network architecture

```text
Internet
   │
   ▼
CDN / Cloudflare WAF (DDoS protection & TLS termination)
   │
   ▼
API & Web Application Containers (Public Subnet)
   │
   ├────── Private Subnet ──────► PostgreSQL (No Public IP)
   │
   ├────── Private Subnet ──────► Redis Cluster (No Public IP)
   │
   └────── Outbound HTTPS ─────► Razorpay API & LLM Providers
```

---

# 93. CORS policy

- Explicit origin whitelist matching merchant domain and customer recovery web domain.
- Wildcard `*` origins are **strictly prohibited** on authenticated API routes.

---

# 94. Security headers

Enforced via Helmet middleware:
- `Content-Security-Policy`: Strict script and style src directives.
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options`: `nosniff`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- `X-Frame-Options`: `DENY`

---

# 95. Rate limiting architecture

Tiered rate limiting via Redis token bucket:
- `/api/v1/auth/login`: 5 req/min per IP
- `/api/v1/webhooks/razorpay`: 200 req/sec per IP
- `/api/v1/customer-recovery/:token`: 30 req/min per IP
- Dashboard API routes: 100 req/min per user
- Simulation routes: 10 req/min (Admin only)

---

# 96. Abuse prevention

The Simulation & Chaos endpoints (`/api/v1/ops/simulations/*`) can generate significant load:
- Restricted to authenticated users with `ADMIN` or `OWNER` roles.
- Rate-limited and completely disabled in public demo mode unless explicitly enabled by admin key.

---

# 97. Data retention & deletion

- Customer recovery tokens: Deleted 30 days after expiration.
- Raw webhook payloads: Archived to cold storage after 30 days.
- Audit events: Retained indefinitely in append-only tables.
- Customer PII: Supports GDPR/DPDP "Right to be Forgotten" via data redaction scripts.

---

# 98. Backups & restore testing

- Automated daily PostgreSQL snapshots with 7-day Point-in-Time Recovery (PITR).
- Documented and tested automated restore verification script in `infrastructure/scripts/test-restore.sh`.

---

# 99. Disaster recovery

- **RPO (Recovery Point Objective)**: $< 15\text{ minutes}$
- **RTO (Recovery Time Objective)**: $< 30\text{ minutes}$
- Verified disaster recovery procedures for database crash, Redis loss, and API redeployment.

---

# 100. Rebuildability

A fresh developer workstation can bootstrap the entire stack with:
```bash
git clone <repo>
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

---

# 101. CI/CD pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):
```text
Checkout
   ↓
pnpm install
   ↓
pnpm lint && pnpm typecheck
   ↓
pnpm test (Unit Tests)
   ↓
pnpm test:integration
   ↓
pnpm test:security (OWASP ASVS Tests)
   ↓
pnpm test:ai-evals (Golden Dataset Regression Gate)
   ↓
Docker Container Build & Scan
```

---

# 102. Deployment strategy

- Zero-downtime rolling or blue/green deployments using container services.
- Automated container health check probes before routing live traffic.
- Automatic rollback triggered on failed health checks.

---

# 103. Environment isolation

Strict isolation across environments:
- **DEV**: Local Docker Compose, MailHog, Razorpay Test Mode.
- **STAGING**: Managed cloud database, Razorpay Test Mode, synthetic data.
- **PROD**: Managed cloud infrastructure, isolated secrets, KMS encryption.

---

# 104. Test Mode architecture

The entire submission and demo operates in **Razorpay Test Mode** (`rzp_test_` keys):
- Safely generates real payment failures, orders, and checkout sessions without real currency.
- Demonstrates realistic revenue recovery flows without financial risk.

---

# 105. Reconciliation & webhook replay UI

The Operations Console provides a visual interface for webhooks:
- Displays received webhooks with processing status.
- **[Replay Webhook]** button: Re-evaluates event through idempotent ingestion pipeline.
- Audit event recorded for every manual replay.

---

# 106. Database consistency strategy

```text
PostgreSQL ACID Transaction
   +
Transactional Outbox Pattern
   +
BullMQ Redis Queue
```
Guarantees database consistency without risking dropped events or lost notifications.

---

# 107. Transactional outbox architecture

```text
DB Transaction
  ├── Update Recovery Case
  ├── Insert Immutable Audit Event
  └── Insert Outbox Event
            │
            ▼
       Outbox Worker
            │
            ▼
       BullMQ Queue
            │
            ▼
       Worker Action Dispatcher
```

---

# 108. Inbox pattern

Incoming webhook events are persisted in `webhook_events` before business processing. Duplicate deliveries are identified via `UNIQUE(provider, provider_event_id)` and acknowledged immediately with `200 OK`.

---

# 109. Exactly-once illusion vs. Idempotent processing

Distributed systems cannot guarantee physical exactly-once delivery over networks.
RecoverAI guarantees **At-Least-Once Delivery + Idempotent Processing**:
- Every consumer is idempotent.
- Duplicate event deliveries converge to the exact same system state without duplicate financial side effects.

---

# 110. Business correctness invariants

1. **Invariant 1**: A recovery case cannot transition to `RECOVERED` without cryptographic webhook signature verification or Razorpay API confirmation.
2. **Invariant 2**: No recovery action executes after recovery case expiration (`expires_at`).
3. **Invariant 3**: A blocked policy action cannot execute through any alternative code path.
4. **Invariant 4**: Duplicate webhook deliveries cannot produce duplicate recovery cases or multiple payment links.
5. **Invariant 5**: Users from Organization A cannot view, query, or mutate records belonging to Organization B.

---

# 111. Formal acceptance tests

```text
GIVEN payment.failed webhook arrives twice for pay_101
WHEN the webhook handler processes both requests
THEN exactly 1 RecoveryCase is created
AND exactly 1 action is scheduled

GIVEN AI recommends ₹1,000 discount for a case
AND merchant policy sets max_discount_inr = 100
WHEN the policy engine evaluates the recommendation
THEN the action is BLOCKED with reason "DISCOUNT_EXCEEDS_POLICY_MAX"

GIVEN AI provider API returns 500 error or times out
WHEN the recovery engine processes the case
THEN the deterministic fallback engine executes within 50ms
AND the case continues without failure
```

---

# 112. Load testing

Load testing with **k6** scripts (`tests/load/`):
- **Scenario 1**: 100 RPS sustained webhook ingestion.
- **Scenario 2**: 500 RPS burst payment failure simulation.
- **Scenario 3**: 1,000 concurrent customer recovery token reads.

---

# 113. Performance budget

- Webhook Acknowledgment Latency: $p50 < 20\text{ ms}$, $p99 < 50\text{ ms}$
- API Read Requests: $p50 < 40\text{ ms}$, $p95 < 120\text{ ms}$
- AI Decision Pipeline: Max $1500\text{ ms}$
- Fallback Engine Execution: $< 5\text{ ms}$

---

# 114. Frontend monitoring

- Client-side error tracking via Sentry.
- Core Web Vitals tracking (LCP < 2.5s, FID < 100ms, CLS < 0.1).
- Zero PII collection in client telemetry.

---

# 115. UX failure handling

Every primary view implements all 6 state variations:
1. `Loading State`: Skeleton screens.
2. `Empty State`: Contextual guidance and actions.
3. `Error State`: Actionable error messages and retry buttons.
4. `Success State`: Clear confirmation toasts.
5. `Permission Denied State`: Clear RBAC feedback.
6. `Offline State`: Network connectivity indicator.

---

# 116. Accessibility

- Full keyboard navigation support (Tab / Shift+Tab / Enter / Space).
- ARIA landmarks and live regions for dynamic alerts.
- Contrast ratio $\ge 4.5:1$ across all dashboard and customer screens.
- Screen-reader tested with descriptive button labels.

---

# 117. Internationalization

- Currency formatting formatted in INR (`₹` format, Lakhs / Crores notation).
- Architecture ready for multilingual string extraction (`next-intl` compatible).

---

# 118. Admin data controls

Admin and Settings views display:
- `Created By`: User name and timestamp.
- `Updated By`: User name and timestamp.
- `Last Change Reason`: Mandatory text input on policy/flag edits.

---

# 119. Configuration management

Clear structural separation of settings:
- **Secrets**: Stored in cloud secret manager.
- **Application Config**: Environment variables (timeouts, ports, URLs).
- **Feature Flags**: Database-backed dynamic flags (`tenant_feature_flags`).
- **Business Policies**: Versioned database policies (`policies`).

---

# 120. Change management

Every sensitive update (policy changes, role changes, kill switch toggles) generates an audit event recording: `who`, `what`, `old_value`, `new_value`, `reason`, and `timestamp`.

---

# 121. Policy versioning

Policies are **never mutated in place**:
Updating `POLICY_V1` creates `POLICY_V2` with an activation timestamp. All historical recovery decisions maintain references to the exact policy version under which they were authorized.

---

# 122. AI prompt versioning

Prompts are registered as `PROMPT_V1`, `PROMPT_V2`, etc. Every decision logged in `ai_decision_logs` references the exact prompt key and version used.

---

# 123. Model rollout & Canary strategy

Supports percentage-based model routing (e.g. 90% `gemini-1.5-flash`, 10% `gemini-1.5-pro`) to evaluate performance differences safely.

---

# 124. Canary strategy

New prompt or model candidates can run in **Shadow Mode**: the candidate generates recommendations in background telemetry without executing financial actions, enabling accuracy comparison against active production models.

---

# 125. Shadow evaluation

Shadow evaluation compares decision concordance between Active Model A and Candidate Model B. Candidate B is promoted only after achieving $> 95\%$ concordance on golden datasets.

---

# 126. AI governance page

Merchant dashboard view displaying:
- Active LLM Provider & Model Name
- Active Prompt Version
- Benchmark Accuracy Score
- Active Fallback Engine Status
- Real-Time Token & Cost Counter

---

# 127. AI decision explanation

The dashboard exposes clean, human-readable reason summaries rather than internal model chains-of-thought:
> *"Selected Payment Link strategy due to temporary bank failure, 1 previous retry attempt, and customer LTV Tier (VIP)."*

---

# 128. Customer messaging safety

Customer messages pass through strict content filters:
- Pre-approved templates only.
- Variable substitution with strict sanitization.
- Zero customer PII leakage.
- Strict length and tone constraints.

---

# 129. Financial claim prevention

The AI model is explicitly prohibited from generating arbitrary financial statements (e.g. *"Your bank has approved your refund"*) unless verified by authoritative Razorpay API status.

---

# 130. Reconciliation dashboard

Operations view showing:
- Total Transactions Reconciled
- Matched Payments Count
- Discrepancy / Mismatch Count
- Auto-Repaired Payments Count
- Pending Manual Review Count

---

# 131. Recovery analytics

Dashboard KPIs:
- Revenue at Risk: e.g. ₹18,40,000
- Recovered Revenue: e.g. ₹6,72,000
- Recovery Conversion Rate: 36.5%
- Average Time-to-Recovery: 2h 14m
- Best Performing Strategy: Payment Link (48.7% recovery rate)

---

# 132. Recovery funnel

Interactive multi-stage visual funnel:
$$\text{Failed Payments (1,284)} \longrightarrow \text{Eligible Cases (947)} \longrightarrow \text{Interventions Attempted (812)} \longrightarrow \text{Revenue Recovered (312)}$$

---

# 133. Strategy analytics table

| Recovery Strategy | Attempted Cases | Recovered Cases | Conversion Rate | Avg Recovery Time |
|---|---|---|---|---|
| **Smart Retry** | 220 | 72 | 32.7% | 45 min |
| **Payment Link** | 310 | 151 | 48.7% | 3h 10m |
| **Customer Messaging** | 180 | 53 | 29.4% | 5h 20m |
| **Incentive Offer** | 42 | 30 | 71.4% | 1h 15m |
| **Human Review** | 60 | 28 | 46.6% | 8h 00m |

---

# 134. Simulation environment

The platform features an autonomous **Synthetic Simulation Engine**:
- Simulates realistic payment distributions across multiple failure reason codes.
- Generates webhooks and runs the full recovery pipeline live.
- Real-time analytics are computed directly from the generated database transactions.

---

# 135. Demo control center

Admin dashboard widget allowing evaluators to:
- Select batch size: `[100] [1,000] [10,000]` payments
- Select failure profile: `[Mixed Failures ▼]`
- Toggle AI Engine: `[Enabled / Fallback Only]`
- Click **[RUN SIMULATION]** to see real-time recovery graphs update live.

---

# 136. Failure simulator

Admin panel failure injector:
- Injected Failure: `LLM_TIMEOUT`
- Injected Failure: `DUPLICATE_WEBHOOK`
- Injected Failure: `OUT_OF_ORDER_WEBHOOK`
- Injected Failure: `RAZORPAY_API_ERROR`
- Injected Failure: `REDIS_UNAVAILABLE`

---

# 137. Chaos dashboard

Displays real-time system responses to injected chaos:
```text
Injected Failure:  LLM TIMEOUT (1500ms Exceeded)
System Response:   Fallback Rule Engine Triggered
Result:            Recovery Action (SMART_RETRY) Scheduled
Business Impact:   0 Lost Cases, 0 Dropped Payments
```

---

# 138. Documentation tree

```text
docs/
├── product/
│   ├── problem.md
│   ├── personas.md
│   ├── requirements.md
│   └── user-stories.md
│
├── architecture/
│   ├── system.md
│   ├── components.md
│   ├── data-flow.md
│   ├── event-flow.md
│   └── deployment.md
│
├── security/
│   ├── threat-model.md
│   ├── auth.md
│   ├── authorization.md
│   ├── webhook-security.md
│   ├── ai-security.md
│   └── secure-development.md
│
├── ai/
│   ├── architecture.md
│   ├── tools.md
│   ├── prompts.md
│   ├── evaluation.md
│   └── fallback.md
│
├── operations/
│   ├── observability.md
│   ├── alerting.md
│   ├── runbooks.md
│   ├── backups.md
│   └── disaster-recovery.md
│
├── database/
│   ├── schema.md
│   └── indexing.md
│
├── api/
│   ├── openapi.yaml
│   └── error-model.md
│
└── adr/
    ├── ADR-001-modular-monolith.md
    ├── ADR-002-postgresql.md
    ├── ADR-003-redis-bullmq.md
    ├── ADR-004-razorpay-integration-boundary.md
    ├── ADR-005-policy-engine.md
    ├── ADR-006-llm-abstraction.md
    ├── ADR-007-outbox-pattern.md
    ├── ADR-008-idempotency.md
    ├── ADR-009-opentelemetry.md
    └── ADR-010-test-mode-only.md
```

---

# 139. Architecture decision records (ADRs)

- **ADR-001**: Modular Monolith Architecture
- **ADR-002**: PostgreSQL 16+ as Authoritative Relational Store
- **ADR-003**: Redis + BullMQ for Asynchronous Workloads
- **ADR-004**: Strict Razorpay Integration Boundary
- **ADR-005**: In-Memory Deterministic Policy Engine
- **ADR-006**: Single-Orchestrator LLM Provider Abstraction
- **ADR-007**: Transactional Outbox Pattern for Multi-Channel Messaging
- **ADR-008**: Idempotency Keys across all Mutative Interfaces
- **ADR-009**: OpenTelemetry W3C Trace Context Propagation
- **ADR-010**: Razorpay Test Mode Architecture

---

# 140. Runbooks

Located in `docs/runbooks/`:
1. `razorpay-webhook-failures.md`
2. `llm-outage.md`
3. `database-outage.md`
4. `redis-outage.md`
5. `queue-backlog.md`
6. `dlq-growth.md`
7. `security-incident.md`
8. `api-key-compromise.md`
9. `data-mismatch.md`
10. `deployment-rollback.md`

---

# 141. Security incident procedure

If an API key or webhook secret is compromised:
1. **Disable Key**: Revoke key in Razorpay dashboard.
2. **Rotate Secret**: Generate replacement key and update cloud secret store.
3. **Deploy Update**: Trigger zero-downtime rolling container restart.
4. **Audit Access**: Query `audit_events` and access logs for unauthorized activity.
5. **Inspect Logs**: Check for data exfiltration.
6. **Document Incident**: Publish post-mortem incident report.

---

# 142. Test pyramid

```text
                 E2E (Playwright)
               /                  \
          Integration (NestJS + TestContainers)
          /                                    \
       Contract (Razorpay)                  AI Eval (Golden Dataset)
       /                                                           \
                               Unit (Vitest / Jest)
```
**Supporting Test Suites**: Security (OWASP ASVS), Load (k6), Chaos Failure Injection, and Migration Rollback Tests.

---

# 143. Contract testing

Validates API request/response contracts against official Razorpay schemas and webhook fixture payloads to prevent breaking changes.

---

# 144. Fixtures

Sanitized JSON fixtures stored in `fixtures/`:
- `fixtures/payment.failed.json`
- `fixtures/payment.authorized.json`
- `fixtures/payment.captured.json`
- `fixtures/order.paid.json`
- `fixtures/duplicate-event.json`

---

# 145. Local development environment

One command boots all local services:
```bash
docker compose up -d
```
Services:
- `postgres`: PostgreSQL 16
- `redis`: Redis 7 alpine
- `otel-collector`: OpenTelemetry Collector
- `mailhog`: Local SMTP inbox (Web UI at `:8025`)

---

# 146. Developer tooling & scripts

Configured in root `package.json`:
- `pnpm dev`: Runs API, Web, and Worker concurrently.
- `pnpm build`: Builds all monorepo applications and packages.
- `pnpm test`: Runs all unit tests.
- `pnpm test:e2e`: Runs Playwright end-to-end tests.
- `pnpm lint`: Runs ESLint across all workspaces.
- `pnpm typecheck`: Executes TypeScript compiler check.
- `pnpm db:migrate`: Executes Prisma database migrations.
- `pnpm db:seed`: Populates test merchants, policies, and demo data.
- `pnpm simulation`: Runs synthetic batch payments generator.
- `pnpm evaluate:ai`: Runs AI Golden Dataset benchmark evaluation.
- `pnpm load-test`: Runs k6 load testing scripts.

---

# 147. Environment variable matrix

| Variable | Description | Secret? | Default | Required Environments |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL pool URI | Yes | `postgresql://...` | All |
| `REDIS_URL` | Redis URI for BullMQ | Yes | `redis://localhost:6379` | All |
| `SESSION_SECRET` | 32-byte hex session key | Yes | `c874b3e0...` | All |
| `APP_ENCRYPTION_KEY` | 32-byte hex DB key | Yes | `a1b2c3d4...` | All |
| `RAZORPAY_KEY_ID` | Test Mode Key ID | No | `rzp_test_...` | All |
| `RAZORPAY_KEY_SECRET` | Test Mode Secret | Yes | `SecretKey...` | All |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook Signature Secret | Yes | `WebhookSec...` | All |
| `AI_PROVIDER` | LLM backend (`gemini`/`mock`) | No | `gemini` | All |
| `GEMINI_API_KEY` | Google Gemini API Key | Yes | `AIzaSy...` | Staging / Prod |
| `NEXT_PUBLIC_API_URL` | Backend API URL | No | `http://localhost:4000` | Web |
| `OTEL_EXPORTER_OTLP_ENDPOINT`| OpenTelemetry Collector | No | `http://localhost:4318` | All |
| `SAFE_MODE_ENABLED` | Global kill switch | No | `false` | All |

---

# 148. Production readiness checklist

### Application
- [x] Strict Zod input validation on all DTOs
- [x] Comprehensive error handling filters
- [x] Multi-tier RBAC & Tenant isolation guards
- [x] Idempotency keys on mutative endpoints
- [x] Timeouts & Circuit Breakers on external APIs

### Data
- [x] Forward-compatible Prisma migrations
- [x] Foreign key constraints & composite indexes
- [x] Automated backups & PITR recovery testing
- [x] Data retention lifecycle rules

### Security
- [x] Secrets stored in cloud KMS / Secret Manager
- [x] Argon2id password hashing + TOTP MFA
- [x] OWASP ASVS 5.0.0 automated test coverage
- [x] Rate limiters & Security headers (CSP, HSTS)
- [x] Immutable compliance audit logging

### AI Decision Engine
- [x] Strict structured JSON schema parsing
- [x] Sandboxed tool permissions
- [x] Deterministic Policy Engine gate
- [x] Instant Fallback Engine (< 5ms)
- [x] Golden Dataset regression suite (50 scenarios)
- [x] AI safety token & latency budgets

### Infrastructure
- [x] Hardened Docker containers (non-root)
- [x] OpenTelemetry traces, Prometheus metrics, Pino logs
- [x] Zero-downtime rolling deployment configuration
- [x] Automated rollback triggers

---

# 149. What must actually be implemented vs. documented

### **Actually Implemented in Codebase**
- Merchant Web Dashboard (Next.js 14)
- Customer Recovery UI (`/r/[token]`)
- Operations & Chaos Console
- NestJS API Platform & Gateway
- PostgreSQL Tenancy Schema & Prisma ORM
- Redis & BullMQ Queues (7 Queues + DLQs)
- Razorpay Adapter (Test Mode)
- Raw Webhook HMAC Ingestion Engine
- Convergent Payment State Machine
- Recovery Engine & FSM
- AI Orchestrator & Bounded Context Builder
- Deterministic Policy Engine & Rules DSL
- Maker-Checker Human Approval Queue
- Transactional Notification Outbox
- Immutable Audit Event Ledger
- Structured Pino Logging & OpenTelemetry Instrumentation
- Reconciliation Engine Worker
- Synthetic Simulation Engine & Chaos Injectors
- Complete Automated Test Suites (Unit, Integration, Security, AI Evals)

### **Implemented in Lightweight Form**
- Terraform IaC modules
- Feature flag engine
- Kill switches
- k6 load test scripts
- Automated backup verification scripts

### **Documented as Production Evolution**
- Multi-region active-active deployments
- Full Kubernetes (EKS/GKE) Helm charts
- Cross-region Disaster Recovery replication
- Formal SOC 2 Type II compliance procedures

---

# 150. The final architecture defended in the interview

```text
                        INTERNET
                           │
                     CDN / WAF
                           │
                     TLS / HTTPS
                           │
                 ┌─────────┴─────────┐
                 │                   │
             Merchant             Customer
              Web App            Recovery Page
                 │                   │
                 └─────────┬─────────┘
                           ▼
                    API APPLICATION
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   Identity/RBAC      Domain Services      Webhooks
        │                  │                  │
        │         ┌────────┼────────┐         │
        │         ▼        ▼        ▼         │
        │      Payment  Recovery  Policy      │
        │         │        │        │         │
        │         └────────┼────────┘         │
        │                  ▼                  │
        │             AI Orchestrator         │
        │                  │                  │
        │             Tool Sandbox            │
        │                  │                  │
        │             Action Executor         │
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
             PostgreSQL          Redis
                  │                 │
                  ▼                 ▼
               Outbox            Queues
                  │                 │
                  └────────┬────────┘
                           ▼
                         Worker
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          Razorpay      Notify       Reconcile
                           │
                           ▼
                       Verification
                           │
                           ▼
                 Domain + Audit Events
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
           Logs          Metrics       Traces
             └─────────────┼─────────────┘
                           ▼
                    Observability
```

---

# 151. The master 33-phase development roadmap

- **Phase 0 — Product Specification**: Problem, personas, user stories, workflows, success metrics.
- **Phase 1 — Architecture**: Domain boundaries, data flows, event flows, threat model, ADRs.
- **Phase 2 — Repository Foundation**: Monorepo, TypeScript, linting, Docker, CI.
- **Phase 3 — Infrastructure**: Postgres, Redis, local telemetry, configuration, secrets model.
- **Phase 4 — Database**: Full schema, constraints, indexes, migrations.
- **Phase 5 — Identity**: Authentication, sessions, RBAC, tenant isolation.
- **Phase 6 — Payment Layer**: Razorpay adapter, order creation, payment verification.
- **Phase 7 — Webhooks**: Raw body, signature verification, event ledger, deduplication, async processing.
- **Phase 8 — Event Reliability**: Inbox/outbox, idempotency, ordering, retries, DLQ.
- **Phase 9 — Payment Reconciliation**: API-vs-database reconciliation and mismatch workflow.
- **Phase 10 — Recovery Domain**: Recovery cases, action history, state machine.
- **Phase 11 — Policy Engine**: Limits, approval requirements, versions.
- **Phase 12 — AI Foundation**: LLM adapter, context builder, schemas, prompt registry.
- **Phase 13 — Agent Tools**: Read tools, controlled actions, permissions.
- **Phase 14 — AI Recovery Strategy**: Recommendation + fallback rules.
- **Phase 15 — Human Approval**: Approval queue, maker-checker, expiry, audit.
- **Phase 16 — Action Execution**: Payment links, retries, notification actions.
- **Phase 17 — Notification System**: Templates, outbox, simulation providers.
- **Phase 18 — Audit System**: Immutable audit events and business history.
- **Phase 19 — Observability**: Structured logs, metrics, traces, correlation.
- **Phase 20 — Reliability**: Timeouts, backoff, circuit breakers, graceful shutdown.
- **Phase 21 — Security Hardening**: ASVS-based testing, RBAC tests, IDOR tests, injection tests.
- **Phase 22 — AI Security**: Prompt injection, tool injection, budget controls, malicious customer data.
- **Phase 23 — AI Evaluation**: Golden dataset, regression suite, cost/latency/quality evaluation.
- **Phase 24 — Simulation**: Synthetic payments, event generation, failure injection.
- **Phase 25 — Dashboard**: Analytics, recovery detail, approvals, audit, webhooks, health.
- **Phase 26 — Operations Console**: Kill switches, feature flags, DLQ replay, webhook replay, incidents.
- **Phase 27 — Customer Recovery UI**: Mobile-responsive `/r/[token]` high-conversion payment page.
- **Phase 28 — Performance**: Load testing, DB profiling, queue testing.
- **Phase 29 — Backup/Restore**: Backup, restore, disaster test.
- **Phase 30 — Infrastructure as Code**: Terraform modules for cloud infrastructure provisioning.
- **Phase 31 — Full Production-Readiness Review**: Security, reliability, AI, observability, UX.
- **Phase 32 — Pitch**: Five-minute scripted product demo.
- **Phase 33 — Submission**: Freeze GitHub, freeze video, documentation polish, final verification.

---

# 152. The three most important architectural ideas

When an evaluator asks: *"What is special about your architecture?"*:

### 1. AI is advisory, not authoritative
$$\text{AI Recommends} \longrightarrow \text{Policy Controls} \longrightarrow \text{Executor Executes}$$
The AI never receives raw payment credentials or database write access. It outputs structured recommendations that must satisfy hardcoded deterministic business policies.

### 2. Everything is traceable
$$\text{Webhook} \longrightarrow \text{Recovery Case} \longrightarrow \text{AI Decision} \longrightarrow \text{Policy Check} \longrightarrow \text{Action} \longrightarrow \text{Payment} \longrightarrow \text{Audit}$$
Correlated through OpenTelemetry `trace_id`, `request_id`, and structured Pino JSON logs across distributed queues and workers.

### 3. The system assumes failure
Duplicate webhooks, out-of-order events, LLM timeouts, Razorpay timeouts, worker crashes, queue backlogs, notification failures, and database mismatches are not treated as exceptions—**they are designed into the core system**.

---

# 153. Single orchestrator AI design

Rather than uncoordinated multi-agent chatter:
$$\text{One Strong Orchestrated Agent} + \text{Deterministic Domain Services} + \text{Policy Engine} + \text{Reliable Event Processing}$$
This design is cheaper, lower latency, easier to test, more reliable, and defensible in technical fintech audits.

---

# 154. What the final GitHub should communicate

When a Razorpay evaluator opens the repository, the narrative is:
```text
Problem
  ↓
Real payment/revenue workflow
  ↓
Reliable event architecture
  ↓
AI decision layer
  ↓
Deterministic controls
  ↓
Financial action
  ↓
Verification
  ↓
Auditability
  ↓
Observability
  ↓
Security
  ↓
Failure recovery
```
That proves an enterprise-grade fintech engineering mindset.

---

## Final Locked Technology Stack
- **Frontend**: Next.js 14+ & TypeScript (App Router, Tailwind CSS, TanStack Query)
- **Backend**: NestJS & TypeScript (Modular Architecture, Guards, Interceptors)
- **Database**: PostgreSQL 16+ (Managed Connection Pool, RLS)
- **ORM**: Prisma ORM (Typed Client, Tenant Extensions)
- **Queue**: Redis 7+ & BullMQ (7 Dedicated Queues + DLQs)
- **Payments**: Razorpay SDK (Test Mode `rzp_test_`)
- **AI Engine**: Google Gemini / OpenAI Provider Abstraction + Zod Structured Output
- **Validation**: Zod & NestJS Validation Pipes
- **Authentication**: Secure Session Cookies + Argon2id + TOTP MFA
- **Logging**: Pino Structured JSON Logging (Redacted Sensitive Paths)
- **Observability**: OpenTelemetry (Traces / Metrics / W3C Trace Context)
- **Error Tracking**: Sentry
- **Testing**: Vitest / Jest + Playwright + k6
- **CI/CD**: GitHub Actions
- **Containers**: Docker (Multi-stage non-root images)
- **Infrastructure**: Terraform
- **Security Baseline**: OWASP ASVS 5.0.0 Level 2
- **Mobile Support**: Fully responsive Customer Recovery Web Interface (`/r/[token]`)

---
*This technical specification represents the locked, immutable engineering contract for RecoverAI. All subsequent implementation code, tests, and documentation must strictly follow the specifications defined herein.*
