# 📖 KostromAi44 Full-Stack Documentation Index & Structure

This index details our documentation layout built on **Fumadocs/Docusaurus** to guarantee high Developer Experience (DX).

---

## 📂 Documentation Directory Structural Map

```
docs/
├── introduction.mdx      # Architectural overview, values, and features
├── get-started/
│   ├── installation.mdx  # Local machine setup and hardware suggestions
│   └── hello-agent.mdx   # Designing your first stateful branching pipeline
├── architecture/
│   ├── engine.mdx        # Inside of the StatefulExecutionEngine & loops
│   ├── providers.mdx     # Multi-provider class contract implementations
│   └── tools-mcp.mdx     # Function schemas & Model Context Protocol hosts
├── enterprise/
│   ├── auth-rbac.mdx     # User workspaces, sessions, and roles
│   └── secrets.mdx       # AES-250-GCM cryptographic encryption shield
└── api-reference/
    ├── runs.mdx          # Programmatic POST /api/runs REST endpoint
    └── sse-streams.mdx   # Real-time event streaming GET /api/stream-pipeline
```

---

## ⚙️ Fumadocs Configuration Instance (`docs/fumadocs.config.ts`)

```typescript
import { defineConfig } from 'fumadocs/config';

export default defineConfig({
  title: 'KostromAi44 Documentation Hub',
  description: 'Enterprise visual orchestrations, custom sandboxed environments, and robust multi-agent setups.',
  theme: {
    primaryColor: '#38bdf8', // Elegant Sky Blue
    monoFont: 'JetBrains Mono',
    sansFont: 'Inter'
  },
  navigation: {
    links: [
      { text: 'GitHub Hub', url: 'https://github.com/ppiiyo/kostromai4444' },
      { text: 'REST API Specs', url: '/api-reference/runs' }
    ]
  }
});
```

---

## ⚡ Running Documentation Locally

To boot our documentation site in development mode:

1. Enter your docs directory:
   ```bash
   cd docs
   ```
2. Install documentation specific packages:
   ```bash
   pnpm install
   ```
3. Boot development documentation instance:
   ```bash
   pnpm run dev
   ```
Our docs will serve at `http://localhost:3001` with high-contrast styles, live interactive sandbox code blocks, and instantaneous search indexing.
