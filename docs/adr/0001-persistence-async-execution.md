# ADR 0001: Server-Side Persistence and Asynchronous Pipeline Execution Strategy

## Status
Accepted

## Context
In Phase 1, KostromAi44 relied primarily on client-side state models and in-memory execution loops. To transition to a robust production-ready state satisfying Phase 2 Department of Defense (DoD) compliance, the platform requires:
1. **Durable, Audit-Compliant Persistence**: Absolute data integrity, tenant separation, and comprehensive audit logs of all pipeline definitions, runs, and security audits.
2. **Reliable Async Task Management**: Execution of complex, long-running agent flows without blocking the primary Node.js server thread, protecting against socket leaks, container memory exhaustion, and unplanned failures.
3. **Rigorous Sandbox Security & SSRF Protection**: Blocking Server-Side Request Forgery (SSRF) and ensuring secure worker execution blocks with complete system logs.

## Decision
We implement a unified **Full-Stack Persistent Architecture** combined with a **State-Machine Driven Asynchronous Execution Pipeline**:

### 1. Unified Polyglot Persistence Layer
- **PostgreSQL / SQLite Adapter**: Utilize a unified adapter-driven database access layer supporting PostgreSQL (`pg`) for highly secure enterprise deployments, fallback to SQLite for local lightweight developer testing.
- **Durable Relational Schema**: Maintain dedicated database tables for project workspaces, version histories, step execution telemetry metrics, and background worker state queues.
- **Tenant Isolation**: Secure access controls and schema queries to guarantee zero cross-tenant contamination.

### 2. Queue-Based Asynchronous Pipeline Execution Engine
- **Non-blocking Loop Execution**: Move from synchronous thread blocking to a state-persisted event loop queue. Long-running or heavy multi-node steps (e.g., recursive reviews, LLM quota wait-times, external webhooks) are executed in non-blocking worker pools.
- **State Machine Architecture**: Every node execution transitions through strict states (`pending` -> `running` -> `completed` | `failed`). If the node execution experiences temporary failure, retry logic handles backoff, and checkpoint states can resume cleanly.
- **Socket Leak & Stream Protections**: Active monitoring and resource limits to prevent server resource starvation and socket leaks during heavy parallel workloads.

### 3. High-Fidelity Honest Mode Simulation Layer
- **API Quota & Sandbox Delineation**: When API keys are missing, invalid, or exhaust quota limits, the engine activates high-fidelity "honest mode" simulation tags (`simulated: true`) on step logs.
- **UI Telemetry Indicators**: Injected visual badges prominently highlight simulated results vs. real API execution, promoting total auditing transparency.

## Consequences
- **Security & Integrity**: Complete alignment with military-grade DoD Phase 2 security mandates, incorporating full input/output sanitization, strict validation, and auditability.
- **Performance**: High parallel throughput with predictable memory overhead and automated retry recovery.
- **Observability**: Clear demarcation of live vs. simulated steps in logs and metrics dashboards.
