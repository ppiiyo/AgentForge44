# 🌌 KostromAi44

**Production‑Grade Visual Low‑Code Orchestrator for Resilient, Self‑Correcting Multi‑Agent AI Networks**

Design complex reasoning topologies on an interactive vector canvas. Execute them with a parallel topological scheduler, self‑healing evaluation loops, sandboxed code execution and multi‑user sync — and serve everything as a robust, versioned, secure REST API.

![CI](https://github.com/ppiiyo/AgentForge44/actions/workflows/ci.yml/badge.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
![License](https://img.shields.io/badge/license-MIT-yellow)
![Coverage gate](https://img.shields.io/badge/coverage-%E2%89%A570%25-brightgreen)
![Security](https://img.shields.io/badge/security-hardened-blue)
![API](https://img.shields.io/badge/API-%2Fapi%2Fv1-green)

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Architecture](#️-architecture)
- [Tech Stack](#️-tech-stack)
- [Quick Start](#-quick-start)
- [Configuration](#️-configuration)
- [Database](#-database)
- [Docker Deployment](#-docker-deployment)
- [Kubernetes & Terraform](#-kubernetes--terraform)
- [Observability](#-observability)
- [Security Model](#️-security-model)
- [API](#-api)
- [Testing](#-testing)
- [CI/CD](#-cicd)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Production Checklist](#️-production-checklist)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Key Features

| Capability | Details |
|---|---|
| 🚀 **Topological Parallel Scheduler** | Kahn's algorithm level‑scheduling with configurable concurrency; independent branches run in parallel promise‑pooling |
| 🔄 **Self‑Healing with Honest Telemetry** | Failed nodes recover via LLM repair (max 2 attempts) and are marked `completed_with_warning` — errors are never silently masked |
| 🛡️ **Hardened Code Sandbox** | Docker isolation: `--cap-drop ALL`, `--network none`, `--read-only`, `--pids-limit 20`, `no-new-privileges`, 64 MB RAM / 0.5 CPU caps; fail‑closed when Docker is absent |
| 📚 **Multi‑Format RAG** | Native parsers for PDF, DOCX, Markdown and raw text; local or remote vector stores (Pinecone / Weaviate / Qdrant) |
| 👥 **Live Collaboration** | Multi‑room Socket.io presence hub: live cursors, selections, cross‑tab sync |
| 🕑 **Time‑Travel Debugger** | Incremental chronological ledger of every graph/variable mutation with replay snapshots |
| 🎛️ **MCP Integration** | Configure and authenticate local/remote Model Context Protocol servers from the Sync Hub |
| 🧑⚖️ **Human‑in‑the‑Loop Gates** | `human_confirmation` nodes pause runs; approve/edit/reject via API or UI |
| 🗳️ **Debate & Reviewer Nodes** | Deterministic metric scoring (JSON schema / regex / semantic) with state rewind and critique feedback loops |
| 🏢 **RBAC & Multi‑Tenancy** | Workspace‑scoped roles (`owner`, `editor`, `viewer`, `api_user`), tenant isolation middleware, JWT `jti` revocation |
| 🧩 **Marketplace & Copilot** | Paginated template marketplace with seeding; AI prompt optimizer preserving `{{variables}}` |

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Client["🖥️ Web Client (React 19 + Vite)"]
        Canvas[ReactFlow Canvas]
        Presence[Presence & Live Cursors]
        Obs[Recharts Dashboards]
        Health[AppHealthMonitor]
    end

    subgraph Gateway["🛡️ API Gateway /api/v1"]
        CSP[Nonce CSP + Helmet + HSTS]
        RL[Tiered Rate Limiter]
        Guard[Unified Auth Guard · JWT + jti blacklist]
        Tenant[Tenant Isolation Context]
        SSRF[SSRF DNS/IP Validator + IP pinning]
    end

    subgraph Engine["🧠 Execution Engine"]
        Sched[Kahn Topology Scheduler]
        Exec[PipelineExecutor · per-node timeouts]
        CB[LLM Circuit Breakers + Exponential Backoff]
        Heal[Self-Healing · completed_with_warning]
        SB[Docker Sandbox / isolated-vm]
    end

    subgraph Queue["📮 BullMQ"]
        W[Workers · 3 attempts · exponential backoff]
        DLQ[Dead Letter Queue + admin retry]
    end

    subgraph Storage["💾 Polymorphic Storage"]
        DB[(Drizzle ORM · SQLite / PostgreSQL)]
        RAG[(Embedding Chunk Stores)]
    end

    subgraph Providers["🤖 Provider Matrix"]
        G[Gemini] O[OpenAI] C[Claude] L[Ollama]
    end

    Client <-->|HTTP / Socket.io| Gateway
    Gateway --> Engine
    Engine <--> Queue
    W --> DLQ
    Engine --> Storage
    Engine --> Providers
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, ReactFlow v11, Zustand, Framer Motion, Recharts, i18next |
| Backend | Node.js ≥ 22, Express, Socket.io, Winston, TSX |
| Database | Drizzle ORM — SQLite (zero‑config) / PostgreSQL (production) |
| Cache & Queue | Redis (ioredis) with capped memory fallback · BullMQ with DLQ |
| Sandbox | Docker (hardened flags) / isolated‑vm |
| Observability | OpenTelemetry OTLP, Prometheus (`/metrics`), Sentry, Grafana Loki |
| Quality | TypeScript **strict**, ESLint, Prettier, Vitest (coverage gates ≥ 70 %), Playwright E2E, k6 load tests |
| Shipping | Multi‑stage Docker (non‑root, prod‑only deps), GitHub Actions, standard‑version |

---

## 🚀 Quick Start

### Prerequisites

- Node.js **≥ 22** and npm **≥ 10**
- (Optional) Docker — required only for sandboxed code nodes
- (Optional) Redis — required for multi‑instance deployments
- (Optional) PostgreSQL — recommended for production scale
- At least one LLM key (Gemini recommended)

### 1. Install

```bash
git clone https://github.com/ppiiyo/AgentForge44.git kostromai44
cd kostromai44
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Generate mandatory secrets (min 32 chars):
#   openssl rand -base64 48  →  JWT_SECRET
#   openssl rand -base64 48  →  ENCRYPTION_MASTER_KEY
```

### 3. Database

```bash
npm run db:push     # create schema (SQLite by default)
npm run db:seed     # seed marketplace templates
```

### 4. Run

```bash
npm run dev         # development (Vite middleware mode)
# — or —
npm run build && npm start   # production bundle
```

Open `http://localhost:3000`. The first registered user automatically becomes **admin** (bootstrap rule, transaction‑safe).

---

## ⚙️ Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | — | `3000` | HTTP port |
| `NODE_ENV` | — | — | `production` enables strict CSP, static serving, strict startup checks |
| `APP_URL` | — | `http://localhost:3000` | Self‑referential base URL for webhooks/callbacks |
| `GEMINI_API_KEY` | ✅* | — | Default provider for visual agents (*at least one LLM key required) |
| `OPENAI_API_KEY` | — | — | OpenAI provider |
| `ANTHROPIC_API_KEY` | — | — | Anthropic provider |
| `OLLAMA_HOST` | — | `http://localhost:11434` | Local offline provider |
| `TAVILY_API_KEY` | — | — | Web‑search tool node |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | — | GitHub integration |
| `AGENTFORGE_API_KEY` | — | — | Master key for headless clients (timing‑safe compared) |
| `JWT_SECRET` | ✅ | — | JWT signing key, ≥ 32 chars |
| `JWT_SECRET_PREVIOUS` | — | — | Previous key for zero‑downtime rotation |
| `ENCRYPTION_MASTER_KEY` | ✅ | — | At‑rest encryption key for stored API keys |
| `DB_TYPE` | — | `sqlite` | `sqlite` or `postgres` |
| `DATABASE_URL` | if postgres | — | `postgres://…` connection string |
| `REDIS_URL` | — | — | `redis://…`; without it a capped in‑memory fallback is used |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | — | OTLP trace exporter (Tempo/Jaeger) |
| `LOKI_URL` | — | — | Grafana Loki log ingestion |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | — | — | Error tracking |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | — | — | Product analytics |
| `VECTOR_STORE_PROVIDER` | — | `local` | `local` / `pinecone` / `weaviate` / `qdrant` |
| `CHAOS_ENGINEERING_ENABLED` | — | `false` | Fault injection; **must stay false in production** |

In `NODE_ENV=production` the server **refuses to start** with missing/invalid `JWT_SECRET`, `ENCRYPTION_MASTER_KEY` or malformed Postgres URLs (fail‑fast). In development it degrades with warnings.

---

## 💾 Database

- **SQLite** (`better-sqlite3`) — zero‑config, ideal for single‑node deployments and tests.
- **PostgreSQL** — pooled client for production scale; set `DB_TYPE=postgres` + `DATABASE_URL`.
- Schema auto‑migrations run on boot; Drizzle Kit manages generation:

```bash
npm run db:generate   # generate migrations
npm run db:migrate    # apply migrations
npm run db:push       # push schema directly
npm run db:studio     # Drizzle Studio GUI
```

---

## 🐳 Docker Deployment

Multi‑stage build: production image contains **only** runtime artifacts and production dependencies, runs as non‑root `node` user, and ships a built‑in healthcheck.

```bash
docker build -t kostromai44 .
docker run -d -p 3000:3000 --env-file .env \
  -v $(pwd)/projects:/usr/src/app/projects \
  --name kostromai44 kostromai44
```

Health probe: `GET /api/v1/health` → `200 {"status":"ok"}` with per‑component detail (db / redis / disk / llm providers).

---

## ☸️ Kubernetes & Terraform

- `kubernetes/` — manifests for deployment, service, HPA and probes wired to `/api/v1/health`.
- `infra/terraform/` — reference infrastructure provisioning.
- `monitoring/` — Grafana dashboards, Loki/Prometheus/Tempo stack.

---

## 📈 Observability

| Signal | Endpoint / Sink |
|---|---|
| Metrics | `GET /metrics` (Prometheus, auth‑protected): pipeline counters, node durations, execution histograms |
| Traces | OpenTelemetry OTLP (`OTEL_EXPORTER_OTLP_ENDPOINT`) |
| Logs | Winston structured logs → stdout + optional Grafana Loki (`LOKI_URL`) |
| Errors | Sentry (backend + React), with self‑healing events logged at `error` level |

---

## 🛡️ Security Model

| Threat | Mechanism |
|---|---|
| XSS | **Nonce‑only CSP in production** (no `unsafe-inline`/`unsafe-eval`), Helmet, DOMPurify template rendering |
| Clickjacking | `X-Frame-Options: SAMEORIGIN` + restrictive `frame-ancestors` |
| SSRF / DNS rebinding | Protocol allowlist, RFC1918/loopback/CGNAT/IPv6 private ranges, DNS resolution check with **IP pinning** |
| Prompt injection | `LLMGuard`: NFKC normalization, zero‑width stripping, multi‑language patterns, base64 payload decoding, canary tokens, risk threshold 0.4 |
| Code execution escape | Docker: `--cap-drop ALL`, `--network none`, `--read-only`, `--pids-limit 20`, `no-new-privileges`, memory/CPU caps; **fail‑closed** without Docker |
| Auth abuse | JWT with mandatory `jti` + Redis blacklist revocation; master key via `crypto.timingSafeEqual`; transaction‑safe admin bootstrap; unique email index |
| Brute force / DoS | Tiered rate limiting (anonymous 100/15 min, authenticated 1000/15 min) + sliding window 30/min on execution; Redis store with memory fallback |
| Secret leakage | At‑rest encryption of stored provider keys (`ENCRYPTION_MASTER_KEY`), zero‑downtime JWT rotation via `JWT_SECRET_PREVIOUS` |
| Supply chain | Dependabot, CodeQL, blocking `npm audit --audit-level=high` in CI |
| Transport | HSTS (1y, includeSubDomains, preload), strict referrer policy |

Security reports: **do not open public issues** — contact the maintainers privately (see `docs/SECURITY.md`).

---

## 🔌 API

- Base path: **`/api/v1`** (legacy `/api` still routed but responds with `Deprecation: true` header).
- Interactive docs: **`/api-docs`** (Swagger UI), schema at `/swagger.json`.
- Auth: `Authorization: Bearer <jwt|master-key>`.

| Method & Path | Purpose |
|---|---|
| `POST /api/v1/auth/register` | Register (first user → admin, transaction‑safe) |
| `POST /api/v1/auth/login` / `logout` | Issue / revoke (`jti` blacklist) tokens |
| `POST /api/v1/execute/graph` | Synchronous run of `nodes` + `connections` (Zod‑validated) |
| `POST /api/v1/execute/blueprint` | Run a stored blueprint by id |
| `POST /api/v1/run-pipeline` | Run with webhooks, metrics, debug replay session |
| `POST /api/v1/runs` | Async headless run (202 + `runId`) |
| `GET /api/v1/runs/:id` · `POST …/resume` · `…/confirm` | Status / resume failed / human‑gate decision |
| `POST /api/v1/admin/dead-letter/:id/retry` | Re‑enqueue a dead‑letter job (admin) |
| `GET /api/v1/health` | Component‑level health |
| `GET /metrics` | Prometheus scrape (auth) |

All graph payloads are validated before execution: known node types, per‑type Zod field schemas, 64 KB field caps, connection integrity, no self‑loops, ≤ 500 nodes.

---

## 🧪 Testing

```bash
npm test                 # unit + integration (Vitest)
npm run test:coverage    # with gates: lines/funcs ≥ 70%, branches ≥ 60%
npm run test:e2e         # Playwright (Postgres + Redis services)
npm run test:load        # k6 pipeline load
npm run test:load:stress # circuit-breaker stress
npm run test:load:soak   # soak
npm run lint             # ESLint + tsc --noEmit (strict)
```

---

## 🔁 CI/CD

| Workflow | Purpose |
|---|---|
| `ci.yml` | Blocking lint + `tsc --noEmit` + blocking `npm audit` + build + coverage‑gated tests + E2E (PR: critical flows, main: full) |
| `security.yml` / `codeql.yml` | Dependency & code analysis |
| `load-test.yml` | k6 performance gates |
| `preview.yml` / `deploy.yml` | Preview environments & tagged deployments |
| `release.yml` | standard‑version releases |

---

## 🗂️ Project Structure

```
├── server.ts               # Bootstrap: env checks → security → guards → /api/v1 routers
├── src/
│   ├── api/                # Route modules + strategies (14 node types)
│   │   ├── engine/         # CycleDetector, ParallelRunner
│   │   └── strategies/     # One strategy per node type
│   ├── components/         # React UI (canvas, dashboards, library)
│   ├── db/                 # Adapters (SQLite/Postgres), polymorphic connection factory
│   ├── middleware/         # guard, tenantIsolation, rateLimit, security, sanitize
│   ├── queue/              # BullMQ + dead letter handling
│   ├── schemas/            # Zod graph/node validation
│   ├── services/           # pipeline executor, retry + circuit breakers, sandbox,
│   │                       # cache, chaos (flag-gated), metrics, tracing, security/*
│   ├── store/              # Zustand slices
│   └── tests/              # unit, integration, e2e, load, fixtures
├── kubernetes/  infra/terraform/  monitoring/  scripts/  docs/
└── Dockerfile  Dockerfile.backend
```

---

## 🧯 Troubleshooting

| Symptom | Cause & Action |
|---|---|
| `Docker Sandbox execution failed … daemon is not available` | Sandbox is **fail‑closed** by design. Install/start Docker, or use non‑code node types. |
| `[Redis] … Degrading to capped memory cache` | Redis unreachable. Single‑instance OK; for multi‑instance restore `REDIS_URL`. |
| `CircuitBreakerOpenError` | Provider outage detected. Breaker half‑opens after 30 s automatically; check provider keys/status. |
| Dead‑letter jobs accumulating | Jobs failed 3 attempts. Inspect error, fix cause, retry via `POST /api/v1/admin/dead-letter/:id/retry`. |
| `Node "…" timeout after 60000ms` | Per‑node timeout. Raise via executor options or split heavy work across nodes. |
| CSP blocks scripts **in dev** | Dev intentionally uses a relaxed CSP; production uses nonce‑only. Verify `NODE_ENV`. |
| `Graph validation failed: …` | Payload violates node schemas (unknown type, oversized field, dangling connection). Details in `issues`. |

---

## ✅ Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET`, `ENCRYPTION_MASTER_KEY` generated (`openssl rand -base64 48`)
- [ ] `DB_TYPE=postgres` + pooled `DATABASE_URL`; backups scheduled
- [ ] `REDIS_URL` configured (shared cache/limiter/revocation)
- [ ] TLS termination in front of the app (HSTS header already emitted)
- [ ] `CHAOS_ENGINEERING_ENABLED=false`
- [ ] Sentry DSN + OTLP/Loki endpoints configured
- [ ] `npm audit` clean, coverage gates green, E2E green
- [ ] Horizontal replicas behind loopback‑trusted proxy only
- [ ] Runbook reviewed: `docs/RUNBOOK.md`

---

## 📖 Documentation

- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — deploy, backup/restore, incident response
- [`docs/SECURITY.md`](docs/SECURITY.md) — threat model, disclosure policy, secret rotation
- [`docs/API.md`](docs/API.md) — full endpoint reference

---

## 🤝 Contributing

1. Fork & create a feature branch.
2. Follow the PR template; keep commits conventional (`feat:`, `fix:`, `chore:`).
3. `npm run lint`, `npm test`, and coverage gates must pass; Husky hooks enforce this locally.
4. Security changes require explicit review — see `docs/SECURITY.md`.

---

## 📄 License

MIT © 2026 KostromAi44 contributors. See [`LICENSE`](LICENSE).

---

> **Status:** hardened release — strict TypeScript, nonce‑only CSP, versioned API (`/api/v1`), circuit‑broken LLM calls, dead‑lettered queues, transaction‑safe auth, fail‑closed sandboxing.
