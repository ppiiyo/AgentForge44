# 🛡️ Enterprise Security Architecture

AgentForge44 is built with a security-first posture, implementing defensive design principles across every tier of the full-stack system. This guide documents the active threat mitigation models, API key management guidelines, and secure deployment configurations.

---

## 🔒 1. Secrets Management and Environment Variables

Every critical secret utilized by AgentForge44 — including LLM vendor credentials (Gemini, OpenAI, Anthropic, Sentry, DB strings, session tokens) — must be declared environment-side.

### Rules of Engagement
1. **Never Commit Secrets to Git**: High-risk environment details must always be ignored. The `.env` file must never be committed. Always maintain `.env.example` with blank placeholders.
2. **Server-Side-Only Secrets API (No `VITE_` Expositions)**: Sensitive tokens such as `GEMINI_API_KEY` are read exclusively by Node.js server threads and kept inside memory limits on our backend handlers. They are **never** prefixed with `VITE_` (which would bundle them into client-side build modules accessible via browser devtools).
3. **Lazy SDK Initialization**: SDKs that require API credentials are bound lazily in request contexts rather than module load time. If a key becomes invalid or missing, server processes continue running smoothly with degraded fallback routes instead of suffering start crashes.

---

## 🛡️ 2. Real-Time Security Features

### 🚫 2.1. SSRF (Server-Side Request Forgery) Protection
When users construct workflows containing `Tool Nodes` (custom JS scripts) or dynamic API connectors, malicious chains might attempt to issue target-probing requests inwards to your secure network infrastructure.
AgentForge44 deploys a custom validation layer (`src/utils/ssrf-validator.js`) that enforces:
* **Host Filtering**: All externalized request destinations requested by tools are validated.
* **Network Exclusion List**: Requests resolving to `localhost`, loopbacks (`127.0.0.1`), metadata endpoints (`169.254.169.254` for AWS/GCP/Azure metadata harvesting), and private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are blocked instantly.

### 🧹 2.2. Secret Payload Cleanser (Audit Log Masking)
In typical production networks, debug logs often leak sensitive customer tokens through stacktraces or raw parameters.
Our logging system intercepts standard logging output streams:
* Checks all outgoing strings in debug messages and API logs for security keys (`api_key`, `authorization`, `password`, `jwt`).
* Replaces secret contents with the safe string `***MASKED***` dynamically before write streams commit messages to system logging aggregators.

### 🧵 2.3. Safe Code Sandbox VM Isolation
Code executed inside custom `Tool Nodes` must never have access to the underlying Node.js runtime process.
* Custom codes run inside isolated VMs using Node.js Worker Threads.
* The sandboxed worker is stripped of access to dangerous global variables (such as `process`, `require`, physical `globalThis` references, or Node's file system `fs` APIs).
* Network connections are heavily rate-limited and timeout boundaries are enforced (e.g. max execution time of 2 seconds) to easily withstand infinite loop lockups or memory leak exhaustion vector attacks.

---

## 🌐 3. Production Deployment Hardening

For maximum perimeter security when deploying AgentForge44 to external networks:

### 🔑 3.1. SSL/TLS Verification
* Force encryption on all connections by configuring a secure Reverse Proxy (Nginx, Cloudflare Tunnel, or Google Cloud Load Balancer) to terminate TLS traffic.
* Enforce **HTTP Strict Transport Security (HSTS)** to automatically shift plaintext browser interactions to SSL/TLS.
* Database clients must require strict SSL certificates (`sslmode=verify-full`) to protect database socket handshakes from middleman listener attacks (MitM).

### 🕸️ 3.2. Network Policies
* **Ingress Firewall**: Only standard external ports (`3000` or `443`) should be exposed to public networks. Keep individual API routing, internal test gateways, or database sockets blocked behind firewall perimeters.
* **VPC Peering**: Database backends must run in private subnets, only accepting traffic coming from the container subnets of AgentForge44.

### ⏳ 3.3. API Rate-Limiting
An integrated sliding window rate-limiter protects backend handlers against brute-force attacks and token consumption loops. For extreme enterprise needs, deploy a distributed rate-limiter (e.g., Redis-backed rate limits) as outlined in the Deployment Guide.
