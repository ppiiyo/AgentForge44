# AgentForge — Visual Orchestration Platform for LLM Multi-Agent Workflows

AgentForge is a visual development environment and runtime engine designed to design, trace, and execute multi-agent pipelines and stateful LLM graphs.

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

## ⚡ Quick Start & Deployment Mode

### 1. Requirements & Prerequisites
To run locally, ensure you have:
- **Node.js** >= 20.0.0 (or matching runtime) and **npm** / **pnpm**
- Or **Docker** & **Docker Compose** installed for containerized, zero-install execution.

### 2. Environment Variables Configuration
Configure your keys in local environment setups or file containers. Before launching, copy the template:
```bash
# Copy template file
cp .env.example .env
```
Open `.env` and fill in your keys:
- `GEMINI_API_KEY`: Required for visual streaming agents and canvas workflows.
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_HOST`, `TAVILY_API_KEY`: Optional secondary connectors.

---

## 🐳 Docker Deployment (Recommended)

Run the entire application locally or in production inside a lightweight, highly secure, and optimized multi-stage container.

### Step 1: Fire up via Docker Compose
Run the following single command to pull the base layers, compile the frontend static assets, bundle the server, and expose the microservice:
```bash
docker-compose up --build
```

### Step 2: Access the Application
Once the container finishes booting, open your browser:
*   🖥️ **Web Console & Visual Workspace**: [http://localhost:3000](http://localhost:3000)

### How Containerization Works (Multi-Stage Build):
1.  **Stage 1: Builder (`node:20-alpine`)**: Installs full configuration manifests and dependencies (including `devDependencies` like Vite, TypeScript, and esbuild), compiles static frontend bundles (`Vite`), and bundles the backend Express TS server into standard `dist/server.cjs` using `esbuild`.
2.  **Stage 2: Runner (`node:20-alpine`)**: Restricts superuser permissions, establishes a lightweight sandboxed Node runtime, installs only production-level modules (`--omit=dev`), maps volume configurations, sets the default user to standard unprivileged `node` user, and runs the compiled bundle.

---

## 🛠️ Bare-Metal Setup (Development Mode)

If you wish to run the development server with live changes:

```bash
# 1. Install all dependencies
npm install

# 2. Run background compilers & live local development server
npm run dev

# 3. Open dev preview in your workspace browser
# Dev Server is mapped directly onto http://localhost:3000
```

---

## 🧪 Testing and Verification

Verify the integrity of active workspaces, backend endpoints, and types:

```bash
# Run ESLint & TypeScript definitions checks
npm run lint

# Compile production-ready builds locally
npm run build
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

## 📜 License

Licensed under the MIT License. See [LICENSE](./LICENSE) for details.

