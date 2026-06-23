# 🚀 Production Deployment Guide

Deploying AgentForge44 into high-availability, enterprise-grade production environments requires configuring proper server resources, environment variables, state databases, and robust service layers. This guide outlines standard deployment architectures for Cloud VMs, Kubernetes (K8s), and Serverless Container environments (such as Google Cloud Run or AWS ECS).

---

## 🏗️ 1. Production Architecture Overview

A production-ready AgentForge44 cluster consists of the following components:

```text
               [ Public Internet Traffic ]
                            │ (HTTPS 443 / WSS)
                    ┌───────▼───────┐
                    │ Reverse Proxy │ (Nginx / Cloudflare / GCP LB)
                    └───────┬───────┘
                            │ (HTTP 3000)
    ┌───────────────────────┼───────────────────────┐
    │                       ▼                       │ Private Network
    │             ┌───────────────────┐             │ (VPC Subnets)
    │             │   AgentForge44    │             │
    │             │  Container Nodes  │             │
    │             └─────────┬─────────┘             │
    │                       │                       │
    ├───────────────────────┼───────────────────────┤
    │                       ▼                       │
    │     ┌───────────────────────────────────┐     │
    │     │   State, Cache & Scaling Layers   │     │
    │     │  ┌──────────────┐ ┌─────────────┐  │     │
    │     │  │  PostgreSQL  │ │ Redis Cache │  │     │
    │     │  └──────────────┘ └─────────────┘  │     │
    │     └───────────────────────────────────┘     │
    └───────────────────────────────────────────────┘
```

1. **Gateway Layer**: A reliable Reverse Proxy (Nginx, Cloudflare, etc.) for TLS termination, routing WebSocket frames correctly (`ws://` / `wss://`), and protecting backend processes.
2. **Compute Nodes**: Scalable AgentForge44 instances packaged as Docker containers running Node.js 18+.
3. **Database Layer (Primary State Store)**: A highly available database instance (PostgreSQL) configured with connection pooling.
4. **Caching & WebSocket Store (Redis)**: Optional but recommended layer for syncing multi-user Socket.io connections across clusters or executing distributed queue structures.

---

## 🛠️ 2. Step-by-Step VM Deployment (Ubuntu / RedHat)

Follow this recipe to deploy on a physical server or local VM:

### Step 1: Install Node.js & Production Tools
Ensure Node.js 18+ (LTS) is installed on the host machine:
```bash
# Add NodeSource GPG key and install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally to handle daemon lifecycle
sudo npm install -y pm2 -g
```

### Step 2: Extract & Build Project Files
Download the codebase and construct the production application bundle:
```bash
cd /var/www/agentforge
npm install --omit=dev

# Execute the production compilation bundling server and frontends
npm run build
```

### Step 3: PM2 Process Management
Create a PM2 system process configuration file (`ecosystem.config.cjs`):
```javascript
module.exports = {
  apps: [{
    name: 'agentforge-server',
    script: 'dist/server.cjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DB_TYPE: 'postgres'
    }
  }]
};
```
Launch the processes as daemon threads:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 🐳 3. Container Deployment (Docker / Cloud Run)

AgentForge44 features a self-contained multi-stage `Dockerfile` making it trivial to run as a secure stateless container.

### Building & Tagging the Image
```bash
docker build -t gcr.io/my-project/agentforge:v1.0.0 .
```

### Environment Variables Checklist (.env)
Apply these environment configurations inside your cloud runtime configuration:

| Name | Type | Value | Purpose |
|------|------|-------|---------|
| `NODE_ENV` | String | `production` | Enables compilation caches and optimizations |
| `PORT` | Integer | `3000` | Designated internal listener port |
| `DB_TYPE` | String | `postgres` | Shifts internal database engine to PostgreSQL |
| `DATABASE_URL` | String | `postgres://user:pwd@db-host:5432/db` | Connection endpoint credentials |
| `GEMINI_API_KEY` | String | `AIzaSy...` | API key credential for running Gemini LLM actions |

---

## 🏎️ 4. Enterprise Components: PostgreSQL & Redis

To scale AgentForge44 seamlessly to cope with thousand-node graphs or high concurrent loads:

### 🐘 PostgreSQL Scaling
* Disable cold starts by setting Drizzle adapter bounds properly.
* Allocate a minimum database connection pool size of 20 connections per Compute Node to easily support microtask pipelines.

### 🔴 Redis integration (Multi-Instance WebSocket Scaling)
When horizontal scaling is fully configured (multiple server nodes running in parallel behind a load balancer), Socket.io cursors rely on a central message broker to sync cursor moves accurately.
1. Upgrade Socket.io inside `server.ts` to utilize the Redis Adapter (`@socket.io/redis-adapter`).
2. Supply a Redis cluster connection string (e.g., `redis://redis-p-host:6379`) to coordinate live active cursor presences and shared blocking locks transparently.
