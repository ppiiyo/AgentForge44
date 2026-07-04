# KostromAi44 Development & Architecture Guide

Welcome to the development guide for **KostromAi44** — a visually intuitive visual Visual Multi-Agent Low-Code Workflow Constructor and Code Generation Engine.

This document describes the stack, architectural choices, server components, test suites, and troubleshooting strategies.

---

## 1. System Context & Tech Stack

KostromAi44 is designed to run as a single-unit **Full-Stack Monolith Application** for developer convenience, high responsiveness, and zero-latency inter-process communication.

* **Frontend:** React 18 / Vite / Tailwind CSS (v4) / Lucide Icons / Framer Motion (`motion/react`)
* **Backend:** Express custom server with TypeScript integration and native ESM type-stripping support.
* **Real-time Sync:** Socket.io-based continuous dual-cursor collaboration server.
* **Workflows Engine:** Built-in `StatefulExecutionEngine` managing parallel data dependency pipes and branching routers.
* **Testing Frame:** Vitest (Unit & Integration) + Playwright (Browser E2E).

---

## 2. Directory Layout & Architecture

The project has been refactored into a clean, un-nested Monolithic directory structure:

```
├── /server.ts              # Primary Full-Stack Express & Socket.io server
├── /vite.config.ts         # Vite bundler options
├── /package.json           # Module scripts, dependencies
├── /scripts/               # Automation scripts (e.g., ensure-oxide.cjs)
└── /src/
    ├── /main.tsx           # React client entrypoint
    ├── /App.tsx            # Main visual canvas workspace
    ├── /types.ts           # Unified TypeScript definitions and interfaces
    ├── /components/        # Sub-components (Marketplace, RAG visualizer, Node settings)
    ├── /hooks/             # Custom state hooks (Collaboration, cursor telemetry)
    ├── /api/               # Logic Engines:
    │   ├── /execution.ts   # StatefulExecutionEngine runtime orchestrator
    │   ├── /providers.ts   # LLM abstracts (Gemini, OpenAI, Anthropic, Ollama)
    │   └── /marketplace.ts # Templates publish/download manager
    └── /tests/             # Multi-layer Test Harness:
        ├── /nodes/         # Unit Tests (Router, LLM, HTTP tools)
        ├── /rag/           # Retriever rank tests
        ├── /api/           # Express JSON integrations (graphs, marketplace, flows)
        └── /e2e/           # Multi-browser Playwright specs
```

---

## 3. Stateful Execution Engine Logic

The workflow engine executes arbitrary directed graphs beginning from an `input` node:

1. **Variables Initialization:** Loads parameters from output lists into `context.variables` context maps.
2. **Dynamic Placeholders Substitutions:** Recursively replaces brace syntax (`{placeholder}`) with value matches from parent steps.
3. **Branching Routers:** Processes advanced conditions (contains, regular expressions, JSON key path lookups) to route executions down desired target branches.
4. **LLM Integrations:** Automatically invokes modern Google Gemini SDK calls, with robust fallbacks to mock sandboxes under rate limits.

---

## 4. Run & Command Scripts

Execute the following commands from the project root:

* **Development Mode:** Starts the backend server with hot Vite middleware mounting.
  ```bash
  npm run dev
  ```
* **Production Compilation:** Bundles frontend assets into `/dist` and compiles server code using esbuild.
  ```bash
  npm run build
  ```
* **Production Run:** Launches the compiled CommonJS server file.
  ```bash
  npm run start
  ```
* **Testing (Vitest):** Runs the comprehensive 33+ unit and integration test suite.
  ```bash
  npx vitest run --exclude "**/*.spec.ts"
  ```
* **E2E Testing (Playwright):** Launches browser automation checks.
  ```bash
  npx playwright test
  ```

---

## 5. Troubleshooting & FAQ

### Tailwind Oxide Module Warnings
* **Symptom:** Warnings about `@tailwindcss/oxide` missing binaries for specific container architectures.
* **Resolution:** The project has an automatic `prebuild` hook executing `node scripts/ensure-oxide.cjs`. This verifies module health, and falls back to vanilla CSS bundlers if necessary, preventing build crashes.

### Server Port Collisions
* **Symptom:** Express prints `listen EADDRINUSE: address already in use 0.0.0.0:3000`.
* **Resolution:** The custom server detects running environments. During Vitest testing pipelines, live listeners are conditionally bypassed using `process.env.NODE_ENV !== "test"`. Or ensure that only one development instance is active at a time.
