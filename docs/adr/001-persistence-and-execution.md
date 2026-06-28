# ADR 001: Server-Side Persistence and Asynchronous Pipeline Execution Model

## Status
Accepted

## Context
As the complexity of the visual AI agent workflow builder grew, the initial local-only state management and synchronous in-memory execution loops presented serious limitations:
1. **Data Loss**: Storing workflows solely in React local state or `localStorage` meant users would lose progress on browser cache clear, session expiration, or when switching devices.
2. **Resource Blocking**: Running long-running multi-node loops (especially with recursive LLM reviewer steps, webhooks, or RAG indexing) blocked the main Node.js web thread, risking socket leak memory issues under high concurrent usage.
3. **Execution Recovery**: If a node execution failed midway due to a transient API error (such as a 429 Rate Limit or 503 Overloaded error), the entire pipeline state would be lost, requiring users to restart the entire sequence from scratch.

To solve these concerns and meet robust enterprise-grade execution stability, we transitioned to a server-side persistent database layout paired with a non-blocking asynchronous execution queue model.

## Decision
We decided to implement the following architectural enhancements:

### 1. Server-Side Persistence Layer with PostgreSQL & SQLite Fallback
- **Unified Adapter Interface**: Created a database connection factory that dynamically switches between **PostgreSQL** (using `pg` for production/enterprise multi-tenant environments) and a local lightweight **SQLite** file database (using `better-sqlite3` for local development/testing).
- **Drizzle ORM Integration**: Implemented programmatic Drizzle-based schema generation, push operations, and cascade deletions (e.g. deleting a Project also deletes all associated Graphs and Pipeline Runs).
- **Relational Tables**:
  - `workspaces`: High-level tenant workspace compartments.
  - `users` and `memberships`: Authentication identity and access permissions mapping.
  - `projects` and `graphs`: Workflows, visual node layout definitions, and connecting edges.
  - `pipeline_runs`: Historic executions, durations, final outputs, and statuses.
  - `metrics`: Granular step-by-step latency, token usages, and status telemetry.

### 2. Asynchronous Queue-Based Execution Model
- **Non-blocking Workflow Queue**: Pipeline runs are transformed into job objects and pushed into an asynchronous queue processor (conceptualized on BullMQ / Redis / SQLite worker models). 
- **State-Machine Driven Nodes**: Workflows execute sequentially and/or in parallel where branch conditions permit. Each node transitions cleanly through distinct states: `pending` -> `running` -> `completed` or `failed`.
- **Background Worker Loop**: Decouples the request-response thread from agent logic. When a request to `/api/run-pipeline` or `/api/queue-execution` arrives, the server immediately returns a `202 Accepted` status with an execution trace ID, and the queue worker processes the graph nodes asynchronously.

### 3. Checkpointing & Resume Strategy for Failed Workflows
- **Execution Checkpoints**: During graph execution, the state of completed nodes is serialized and persisted as a "checkpoint snapshot" in the database.
- **Fail-Safe Recovery**: If a node fails (e.g. LLM call fails, network timeout on webhook), the pipeline halts and saves a `failed` checkpoint containing the intermediate state and accumulated outputs up to that node.
- **Resumable Execution**: Users can fix the configuration (e.g., correct prompt templates or provide valid API keys) and request to *resume* the workflow. The worker reads the last successful checkpoint, skips already completed nodes, and resumes execution exactly from the failed step, preventing redundant token costs and reprocessing latency.

## Consequences
- **High Thread-Safety**: Server remains responsive during heavy parallel workload spikes, avoiding event-loop blocking.
- **Reliable Persistence**: Complete safety of user projects and historic runtime traces, satisfying enterprise compliance.
- **Improved UX**: Users can view real-time visual progress updates via Socket.io streaming, and easily recover failed pipelines without losing intermediate computation state.
- **Developer Simplicity**: Programmatic database migrations run automatically on startup to ensure zero manual setup overhead.
