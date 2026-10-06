<div align="center">

<img src="https://raw.githubusercontent.com/ppiiyo/AgentForge44/main/public/logo.svg" alt="KostromaAi44 Logo" width="160" />

# AgentForge44

> Visual, low-code orchestrator and development environment for multi-agent LLM systems

[![CI](https://github.com/ppiiyo/AgentForge44/actions/workflows/ci.yml/badge.svg)](https://github.com/ppiiyo/AgentForge44/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-149eca.svg)](https://react.dev/)

[Quick Start](#-quick-start-5-minutes) · [Documentation](./docs/api.md) · [Deployment](./docs/deployment.md) · [Security](./docs/security.md) · [RU](./README.ru.md) · [ZH](./README.zh.md)

</div>

---

## 🚀 Quick Start (5 minutes)

Get AgentForge44 running locally with a single command:

```bash
# 1. Clone and install
git clone https://github.com/ppiiyo/AgentForge44.git
cd AgentForge44
cp .env.example .env
npm install

# 2. Initialize database (SQLite by default — Postgres optional)
npm run db:migrate
npm run db:seed

# 3. Start the dev server (Vite + tsx server)
npm run dev
```

Then open **http://localhost:5173** in your browser. The first-launch wizard walks you
through connecting an LLM provider (OpenAI / Anthropic / Gemini) and creating your
first agent pipeline.

### Common commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start frontend + backend with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm test` | Run unit + integration tests |
| `npm run test:e2e` | Playwright end-to-end suite |
| `npm run test:load` | k6 load-test (pipeline + circuit breaker) |
| `npm run lint` | ESLint over the whole codebase |
| `npm run db:studio` | Open Drizzle Studio for the configured DB |

### Deploy to production

See [`docs/deployment.md`](./docs/deployment.md) for a complete walkthrough covering
Docker, Kubernetes (Argo Rollouts), AWS EKS via Terraform, and observability wiring
(Grafana + Prometheus + Sentry).

---