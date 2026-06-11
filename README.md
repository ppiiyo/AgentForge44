# AgentForge — Visual Orchestration Platform for LLM Multi-Agent Workflows

AgentForge is an open-source visual development environment and runtime engine designed to design, trace, and execute multi-agent pipelines and stateful LLM graphs.

---

## 🖼️ User Interface Preview

```text
┌────────────────────────────────────────────────────────────────────────┐
│  AgentForge Console                                 [Run] [Save] [Share]│
├────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐   │
│  │  Input Node   ├───────►│  Prompt Node  ├───────►│  Gemini Node  │   │
│  │  Variables    │        │  Templates    │        │  Reasoning    │   │
│  └───────────────┘        └───────────────┘        └───────┬───────┘   │
│                                                            │           │
│                                                            ▼           │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐   │
│  │ Output Node   │◄───────┤  Trace Audit  │◄───────┤ Critic Node   │   │
│  │ Payload Out   │ (Retry)│  Execution    │        │ self-correct  │   │
│  └───────────────┘        └───────────────┘        └───────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### 1. Requirements
Ensure you have native tools and [pnpm](https://pnpm.io/) v8+ installed:
- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 2. Setup & Execution
```bash
# Clone the repository
git clone https://github.com/ppiiyo/AgentForge44.git
cd AgentForge44

# Create environment variables file
cat <<EOT >> .env
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DATABASE_URL=sqlite://dev.db
EOT

# Install monorepo dependencies
pnpm install

# Start the full-stack development workspace
pnpm run dev
```

---

## ☄️ Architecture

```mermaid
graph TD
    A[Inputs Node: Dynamic Variables] --> B[Prompt Node: Context Compilation]
    B --> C[LLM Node: Multi-Provider Generation]
    C --> D{Critique Node: Self-Correction Loop}
    D -- Retry (If Validation Fails) --> B
    D -- Approved --> E[Output Node: Final Payload]
    
    subgraph Core Execution Engine (packages/core)
        Executor[Graph Executor] --> Match[Node Handler Router]
        Match --> ShortTerm[Short-Term Memory Manager]
        Match --> VectorIndex[Vector Embeddings Retriever]
    end
```

---

## 🗺️ Roadmap & Project Timeline

### 🟢 Phase 0: Foundations & Monorepo Configuration (Active)
- **Monorepo Setup:** Transition to `Turborepo` with isolated modules for core engine, providers, database schemas, and CLI operations.
- **Strict Verification Rules:** Pre-compile ESLint checks, strict compiler checks, and modular tests on PR cycles.
- **Explicit Licenses:** Fully declared MIT open-source permissions.

### 🟡 Phase 1: Modular Multi-Agent Capabilities
- **Multi-Provider SDK Hooks:** Seamless routing to Anthropic, OpenAI, Ollie, and Cohere.
- **Stateful Cyclic Execution Engine:** Direct execution graphs containing conditions, loops, and parallel paths.
- **Function Calling Framework:** Dynamic execution of system utilities like Google Search (Tavily), Web Scrapers, and sandboxed code execution environments.
- **Vector-Based Short and Long-Term Memory:** Embedding-backed SQLite persistence for session states and historical memory.

### 🔴 Phase 2: Production Scale & Security
- **Headless API Routing:** Execute workflows via stateless REST endpoints: `POST /api/runs`.
- **Workspaces & Multi-Tenancy:** Secure authentication setups allowing collaborative workspaces.
- **Configuration CLI:** Run headless nodes via a command-line executor: `agentforge run --config ./graph.json`.

---

## 🤝 Contributing

We welcome contributions to the visual orchestrator codebases:
1. Fork the workspace.
2. Form your module patch branch (`git checkout -b feature/ProviderUpgrade`).
3. Commit safely and run linter validation checks locally: `pnpm run lint`.
4. Open a clean pull request against the `main` upstream branch.

---

## 📜 License

Licensed under the MIT License. See [LICENSE](./LICENSE) for details.
