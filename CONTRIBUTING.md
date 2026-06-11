# 🤝 AgentForge44 Contributing Guidelines

We love your interest in contributing to **AgentForge44**! Follow this document to understand our standards, directory structure, and instructions for introducing new modules in clean, production-ready style.

---

## 🏗️ Directory Anatomy

Our modular architecture ensures code predictability and separation of concerns:
- `/server.ts` — Central Express gateway (with rate limiting and SSE stream channels).
- `/src/api/execution.ts` — Core stateful graph traversing and looping engine.
- `/src/api/providers.ts` — Unified interface for external LLM models.
- `/src/api/tools.ts` — Native sandboxed system executors.
- `/src/api/agentCorePlus.ts` — Advanced Supervisor patterns, RAG managers, and LLM-as-a-Judge evals.

---

## 🛠️ How to Add a New LLM Provider

All LLM provider configurations inherit from the abstract base class `LLMProvider` defined in `src/api/providers.ts`. Follow this simple pattern to introduce a new service provider:

### 1. Implement the API Contract
Extend `LLMProvider` in `src/api/providers.ts`:

```typescript
import { LLMProvider, LLMCallConfig, LLMResponse } from './providers.js';

export class CustomSaaSProvider extends LLMProvider {
  private apiToken: string;
  private model: string;

  constructor(apiToken: string, model: string = "expressive-v1") {
    super();
    this.apiToken = apiToken;
    this.model = model;
  }

  getName() {
    return `CustomSaaS (${this.model})`;
  }

  async generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
    if (!this.apiToken) {
      throw new Error("API Token for CustomSaaS must be provided.");
    }

    const payload = {
      modelName: this.model,
      promptText: prompt,
      temperatureFactor: config?.temperature ?? 0.7
    };

    const res = await fetch("https://api.custom-saas.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`CustomSaaS provider error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    return {
      text: data.generatedResult || "",
      raw: data
    };
  }
}
```

### 2. Register within Runtime Runtimes
Expose your new class inside `StatefulExecutionEngine` (`src/api/execution.ts`) or your backend controllers to let visual canvas flows seamlessly toggle the new engine.

---

## 🧪 Testing Before You Publish

We run thorough verification suites before merging:
1. Ensure your TypeScript constructs compile perfectly without structural warnings:
   ```bash
   npm run lint
   ```
2. Run production packaging checks to verify ESModule routing:
   ```bash
   npm run build
   ```

*Happy scripting, and thank you for building the open-source future of visual Multi-Agent systems!*
