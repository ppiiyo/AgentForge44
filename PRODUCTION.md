# AgentForge Production Deployment Guide

This guide details the system requirements, configuration variables, and deployment workflows for running the **AgentForge** visual orchestrator in a production environment. Following these practices ensures maximum resilience, high availability, and security-fortified operations.

---

## 🏗️ 1. Infrastructure Architecture & Prerequisites

AgentForge utilizes a stateless, horizontally scalable multi-tier architecture. It is designed to run inside containerized environments (Kubernetes, AWS ECS, Google Cloud Run) backed by robust cloud services.

### 🗄️ Database Tier (PostgreSQL v15+)
- **Purpose**: Durable, relational multi-tenant persistence (users, workspaces, graphs, metrics, versions, marketplace).
- **Production Standard**: A managed instance (such as Amazon RDS, GCP Cloud SQL, or Supabase) with automatic backups, multi-AZ high availability, and secure SSL/TLS connection tunnels.
- **Resilience Fallback**: If the Postgres instance is unavailable on startup, AgentForge’s connection factory automatically defaults to a high-resilience local SQLite database context to maintain application uptime.

### ⚡ Cache & Queue Tier (Redis v7+)
- **Purpose**: Dynamic rate-limiting, background task/pipeline execution via BullMQ, and pub/sub message synchronization for multi-user collaboration cursors.
- **Production Standard**: A managed cluster (such as ElastiCache or Redis Enterprise) configured with persistent storage options (AOF/RDB) and password authentication.

### 🐳 Container Runtime
- **Purpose**: Stateless node serving the front-end assets and Express API endpoints.
- **Production Standard**: Run the containerized service behind an API Gateway/Load Balancer configured with HTTPS termination, rate-limiting rules, and automated health checking.

---

## 🔑 2. Environment Variables Reference

Configure these environment variables in your deployment manifests or secret manager (e.g., AWS Secrets Manager, GCP Secret Manager).

### Cryptographic Secrets

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `JWT_SECRET` | **Yes** | *None* | A high-entropy, cryptographically strong key (minimum 32 characters) used to sign and verify JSON Web Tokens (JWT) for authentication. |
| `ENCRYPTION_MASTER_KEY` | **Yes** | *None* | A secure 32+ character key used for AES-256-GCM symmetric encryption of third-party API keys and workspace credentials stored in the database. |

> 🛡️ **Zero-Crash Safety Fallback**: If `JWT_SECRET` or `ENCRYPTION_MASTER_KEY` are missing or insecure in production, AgentForge will automatically generate a cryptographically strong, secure ephemeral fallback key on startup and log a prominent security warning. Active sessions will invalidate on restart.

### Database Settings

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DB_TYPE` | No | `sqlite` | Specifies database dialect. Set to `postgres` for production relational multi-tenant setups. |
| `DATABASE_URL` | Conditional | *None* | Required if `DB_TYPE` is `postgres`. Must follow the URI format: `postgresql://user:password@host:port/dbname?sslmode=require`. |

### Redis & Queue Management

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `REDIS_URL` | No | *None* | Connection URL for Redis (e.g., `redis://:password@redis-host:6379/0`). If provided, takes precedence over individual host/port variables. |
| `REDIS_HOST` | No | `127.0.0.1` | Hostname of the target Redis server/cluster (ignored if `REDIS_URL` is set). |
| `REDIS_PORT` | No | `6379` | Port number of the target Redis server. |
| `REDIS_PASSWORD` | No | *None* | Password authentication string for Redis connection. |

### Third-Party LLM & AI Providers

These keys are used for multi-agent orchestrations, evaluators, and LLM code-generation models.

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | No | *None* | API Key for Google Gemini model services (used by the default Copilot backend). |
| `OPENAI_API_KEY` | No | *None* | API Key for OpenAI services (GPT-4o/GPT-3.5 integration). |
| `ANTHROPIC_API_KEY` | No | *None* | API Key for Anthropic services (Claude 3.5 Sonnet integration). |

### Security, Performance, and Observability

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | No | `development` | Set to `production` to disable developer debugging endpoints and activate strict security middleware. |
| `DISABLE_HMR` | No | `false` | Set to `true` inside production environments to suppress local Hot Module Replacement listeners. |
| `CORS_ALLOWED_ORIGINS` | No | `*` | Comma-separated list of allowed domains for API access (e.g., `https://app.agentforge.com`). |
| `SENTRY_DSN` | No | *None* | Integrates Sentry error reporting for live API log tracking. |

---

## 📦 3. Production Build & Lifecycle Workflow

To maintain extremely fast container startups and small image sizes, AgentForge uses a multi-stage Docker compilation process.

### Step 1: Multi-Stage Build Pipeline
The build pipeline compiles assets, bundles the TypeScript Express server, and minimizes runtime package trees.

```bash
# 1. Build the production bundle
npm run build

# 2. Prune developmental node modules to keep containers lean
npm prune --omit=dev
```

- **Frontend Assets**: Vite bundles code and assets into the `/dist` directory as static client-side single-page files.
- **Backend Bundle**: Esbuild packages the TypeScript server (`server.ts`) into a single, optimized CJS file at `dist/server.cjs`, resolving relative module trees and generating accurate sourcemaps for runtime stack trace logs.

### Step 2: Database Schema Migration
Drizzle schema updates are automatically applied at start time to maintain database synchronization.

```bash
# Generate SQL migrations based on TypeScript schema configurations
drizzle-kit generate

# Run pending database table schema migrations against Postgres
drizzle-kit migrate
```

---

## 🚀 4. High-Availability & Scalability Practices

### Stateless Container Scaling
- Ensure the containers do not store state on local filesystems (such as `/projects` directories). Map workspace exports to distributed cloud storage blocks or rely on the primary multi-tenant Postgres storage layer.
- Ensure the Load Balancer uses standard round-robin routing; Socket.io is backed by a Redis pub/sub adapter to securely sync active developer cursors and presence signals across all containers.

### Health and Readiness Probes
Configure your Kubernetes container specs or Cloud Run definitions to verify server health:

- **Liveness Probe**: `GET /api/health`
  - Returns `200 OK` when the Express HTTP container is responsive.
- **Readiness Probe**: `GET /api/health`
  - Ensures database connection pathways and background message queues are alive.

### Advanced Observability
- **Prometheus Metrics**: Access `GET /metrics` on port 3000 to scrape real-time statistics (memory footprint, HTTP request durations, active socket connections).
- **OpenTelemetry**: Configure tracing collectors to capture trace scopes across modular API execution passes.

### Failure Defenses (Resilience Stack)
- **Exponential Backoffs**: All model invocations and queue transactions are guarded by retry cycles with phase noise (Jitter) to gracefully handle provider outages.
- **Circuit Breakers**: Heavy communication channels dynamically cut off failed services before causing cascade memory spikes.
