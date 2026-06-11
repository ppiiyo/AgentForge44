# 🚀 AgentForge44 — Production-Grade Visual LLM Workflow Orchestrator

<p align="center">
  <img src="https://img.shields.io/badge/Powered_by-Gemini_Core-00F?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Gemini Powered" />
  <img src="https://img.shields.io/badge/Node.js-v18%2B-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Vite-React%20%2B%20TS-646CFF?style=for-the-badge&logo=vite" alt="Vite + React" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/CI-Passing-brightgreen?style=for-the-badge&logo=github-actions" alt="CI Status" />
</p>

---

## 📖 Overview

**AgentForge44** is an enterprise-grade visual, low-code rapid development environment designed to architect, experiment, trace, and deploy production-ready multi-agent systems and LLM workflows in seconds. With an style-forward reactive node interface (inspired by Flowise and LangFlow) and a super-optimized TS/Express runtime backend, AgentForge44 provides ultimate safety, sub-graph testing sandboxes, and lightning-fast developer experience.

---

## 🖼️ Application Preview

```
┌────────────────────────────────────────────────────────────────────────┐
│  AgentForge44 Console                           [Play] [Save] [Share]  │
├────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐   │
│  │  Input Node   ├───────►│  Prompt Node  ├───────►│  Gemini-LLM   │   │
│  │  Variables    │        │  Parameters   │        │  Temperature  │   │
│  └───────────────┘        └───────────────┘        └───────┬───────┘   │
│                                                            │           │
│                                                            ▼           │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐   │
│  │ Output Node   │◄───────┤  Agent Trace  │◄───────┤ Critique-Node │   │
│  │ Compilation   │ (Retry)│  Isolated     │        │ Verification  │   │
│  └───────────────┘        └───────────────┘        └───────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Architecture Workflow

```mermaid
graph TD
    A[Inputs Node: Dynamic Variables] --> B[Prompt Node: Context Compilation]
    B --> C[Gemini LLM Node: Core Reasoning]
    C --> D{Critique Node: Self-Correction Loop}
    D -- Retry (If Validation Fails) --> B
    D -- Approved --> E[Output Node: Compile Payload]
    
    subgraph Execution Sandbox (Sub-Graph isolated dry-run)
        F[Select Node ID] --> G[Extract Path Dependency Tree]
        G --> H[Synthesize Mock Context]
        H --> I[Execute Isolated Sandbox Node Trace]
    end
```

---

## ⚡ Quick Start (3 Commands)

Get your environment running with zero fluff:

```bash
# 1. Install Workspace Monorepo Dependencies
npm install

# 2. Provision Environment Secrets
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env

# 3. Boot Dev Server (Frontend + Express API Proxy)
npm run dev
```
Open **`http://localhost:3000`** and start building your graph.

---

## 💎 Competitive Advantages

| Feature | **AgentForge44** 🚀 | **LangFlow / Flowise** | **Naive LLM Playgrounds** |
| :--- | :--- | :--- | :--- |
| **Engine Footprint** | Ultralight Node/TS ESM-CJS bundle. Binds in < 2s. | High-latency Python environments / bulky Docker layers. | Static Client SPA only; exposed browser API keys. |
| **Isolated Dry-Run** | **Supported.** Interactive virtual trace with sandbox variables. | Requires entire graph execution; no route splitting. | None. Static mock evaluations only. |
| **Visual State Tracing** | Motion-reactive sequence execution tracking. | Basic progress logs. | No node tracing mechanics. |
| **Deployment Security** | High safety proxy layer; zero runtime leaks to DOM. | Complex multifront configs. | Client CORS vulnerable. |

---

## 📅 Roadmap (The Architect's blueprint)

### 🟢 Phase 0: Foundations & Monorepo (Completed)
- **CI/CD Pipeline:** Complete typecheck and bundler sanitization on PR and push steps.
- **MIT License:** Solidified license files and package definitions.
- **Unified Workspace Structure:** Clean Separation of Concerns.

### 🟡 Phase 1: Core Orchestration Agent Engine
- **Multi-provider SDK:** Integration with Anthropic, OpenAI, Ollama through Unified `LLMProvider` signature.
- **Function Calling & Standard Tools:** Extensible JSON Schema mapping for `web_search` (Tavily), secure sandboxed `code_interpreter`, and `file_system_operations`.
- **Sliding-Window DB memory:** Memory boundaries leveraging short-term memory sliding windows and persistent vector storage structures.

### 🔴 Phase 2: Production Reliability
- **Multi-tenant workspaces & RBAC:** Auth structures separating user actions (`Viewer`, `Editor`, `Owner`).
- **Headless Execution Router:** Execution endpoints at `POST /api/runs` secured with route rate limits.
- **Configurable CLI:** Run visual models in production with: `agentforge run ./graph.json --input "..."`.

### 🟣 Phase 3: Sophisticated Multi-Agent Topologies
- **Dynamic Supervisor Patterns:** Layered graph executions and agent-to-agent negotiations using state queues.
- **Human-in-the-loop Gateways:** Breakpoint interrupts with React actions for safe tool execution approvals.

---

## 🔒 Security Architecture

AgentForge44 acts as an air-gapped system between client frontends and LLM models:
* **Token Zero-Leakage:** All API keys remain isolated within backend memory environments.
* **Server Intermediaries:** Browser-client calls represent pure node configuration payloads; execution coordinates strictly load from Express endpoints.

---

## 🤝 Contributing

We welcome additions to AgentForge44:
1. Fork the repo.
2. Build your feature branch (`git checkout -b feature/NewLLMSupport`).
3. Commit safely and check type safety via `npm run lint`.
4. Open a Pull Request!

---

*Crafted for production-grade Multi-Agent environments. Build secure, build fast.*
