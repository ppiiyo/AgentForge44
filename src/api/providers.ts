import { GoogleGenAI } from "@google/genai";
import { checkUserBudget, recordUserUsage } from "../services/usage-tracker.js";
import { cache, computeHash } from "../services/cache.js";
import { logger } from "../utils/logger.js";
import { traceSpan } from "../services/tracing.js";
import { llmCallCounter, llmCallDuration } from "../services/metrics.js";
import { retryWithBackoff } from "../utils/retry.js";
import { DEFAULT_MODELS, PROVIDER_MODELS } from "../config/models.js";
import { circuitBreakerRegistry } from "../services/circuitBreaker.js";
import { chaosEngine } from "../services/chaosEngine.js";

export interface LLMCallConfig {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  tools?: any[];
  userId?: string;
}

export interface LLMResponse {
  text: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
    id?: string;
  }>;
  raw?: any;
  simulated?: boolean;
}

export abstract class LLMProvider {
  abstract getName(): string;
  protected abstract _generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse>;

  async generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
    const userId = config?.userId;
    const estInputTokens = Math.ceil((prompt || "").length / 4);

    // Compute precise key for the model and prompt snapshot
    const model = (this as any).model || this.getName();
    const promptHash = computeHash(prompt || "");
    const cacheKey = `llm:cache:${model}:${promptHash}`;

    // Prompt cache lookup
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info(`[Prompt Cache] HIT for model "${model}" with key ${cacheKey}`);
        return JSON.parse(cached) as LLMResponse;
      }
    } catch (err: any) {
      logger.warn(`[Prompt Cache] Read hit failed: ${err.message}`);
    }

    if (userId) {
      const allowed = await checkUserBudget(userId, estInputTokens);
      if (!allowed) {
        const err = new Error("429 Budget Exceeded");
        (err as any).status = 429;
        throw err;
      }
    }

    const start = Date.now();
    let status = "success";
    let response: LLMResponse;

    const breaker = circuitBreakerRegistry.getBreaker(this.getName());

    try {
      response = await breaker.execute(async () => {
        // Chaos Engineering check inside the Circuit Breaker context
        await chaosEngine.checkLlmChaos(this.getName());

        return traceSpan("llm_generate", {
          provider: this.getName(),
          model: (this as any).model || "unknown",
          prompt_length: (prompt || "").length
        }, () => retryWithBackoff(() => this._generate(prompt, config), {
          retries: (process.env.NODE_ENV === 'test' || process.env.VITEST || process.env.VITEST === 'true') ? 0 : 3,
          delay: 50, // Lower initial delay for fast transient recoveries
          factor: 2,
          maxDelay: 5000,
          shouldRetry: (err: any) => {
            const errMsg = String(err.message || err).toLowerCase();
            if (errMsg.includes("budget exceeded") || (err.status === 429 && errMsg.includes("budget"))) {
              return false;
            }
            if (err.status === 400 || err.status === 401 || err.status === 403) {
              return false;
            }
            // Also inspect error messages mirroring 400 Bad Request, 401 Unauthorized or 403 Forbidden
            if (errMsg.includes("400") || errMsg.includes("401") || errMsg.includes("403")) {
              return false;
            }
            return true;
          }
        }));
      });
    } catch (err: any) {
      status = "error";
      throw err;
    } finally {
      const durationSeconds = (Date.now() - start) / 1000;
      try {
        llmCallCounter.labels(this.getName(), (this as any).model || "unknown", status).inc();
        llmCallDuration.labels(this.getName(), (this as any).model || "unknown", status).observe(durationSeconds);
      } catch (err: any) {
        logger.warn(`Failed to track LLM metrics: ${err.message}`);
      }
    }

    // Dynamic cache storage
    if (response && response.text) {
      try {
        await cache.set(cacheKey, JSON.stringify(response), 3600); // 1-hour default TTL
      } catch (err: any) {
        logger.warn(`[Prompt Cache] Storing response failed: ${err.message}`);
      }
    }

    if (userId) {
      const estOutputTokens = Math.ceil((response.text || "").length / 4);
      await recordUserUsage(userId, estInputTokens + estOutputTokens);
    }

    return response;
  }
}

/**
 * Gemini Provider leveraging official modern @google/genai SDK
 */
export class GeminiProvider extends LLMProvider {
  private apiKey: string;
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODELS.gemini) {
    super();
    this.apiKey = apiKey;
    
    // Ensure the model is in the allowed registry or fall back gracefully
    const allowed = PROVIDER_MODELS.gemini.allowed;
    if (!allowed.includes(model)) {
      logger.warn(`Model "${model}" not recognized by Gemini provider registry. Falling back to default "${DEFAULT_MODELS.gemini}".`);
      model = DEFAULT_MODELS.gemini;
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  getName() { return `Gemini (${this.model})`; }

  async _generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
    const isExplicitSandbox = this.apiKey && this.apiKey.startsWith("sandbox_");
    const isPlaceholderKey = this.apiKey === "your_gemini_api_key_here";
    const isDemoMode = process.env.DEMO_MODE === "true";

    const isSandbox = isDemoMode || isExplicitSandbox || isPlaceholderKey;

    if (!this.apiKey && !isDemoMode) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    if (isSandbox && (!this.apiKey || this.apiKey.startsWith("sandbox_") || this.apiKey === "your_gemini_api_key_here" || !process.env.GEMINI_API_KEY || isDemoMode)) {
      const simText = `[Simulated response due to API sandbox limits]\nProcessed prompt text successfully: "${prompt.substring(0, 100)}..." using local simulation layer.`;
      return {
        text: simText,
        raw: { simulated: true },
        simulated: true
      };
    }

    const aiConfig: any = {
      temperature: config?.temperature ?? 0.7,
      systemInstruction: config?.systemInstruction || undefined,
    };

    if (config?.tools && config.tools.length > 0) {
      aiConfig.tools = config.tools;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: aiConfig
      });

      const candidate = response.candidates?.[0];
      const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall);
      
      let toolCalls: any[] | undefined = undefined;
      if (functionCalls && functionCalls.length > 0) {
        toolCalls = functionCalls.map((fc: any) => ({
          name: fc.functionCall.name,
          arguments: fc.functionCall.args || {}
        }));
      }

      return {
        text: response.text || "",
        toolCalls,
        raw: response,
        simulated: false
      };
    } catch (err: any) {
      const errMsg = String(err.message || err);
      const isQuotaError = errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || err.status === 429;
      
      if (isQuotaError) {
        if (process.env.STRICT_LLM_ERRORS === 'true') {
          throw err;
        }
        if (process.env.DEMO_MODE === 'true' || isSandbox) {
          console.warn(`[KostromAi44] Quota limit reached in providers Gemini model run. Activating simulated fallback mock response...`);
          const simText = `[Simulated response due to API quota limits (429)]\nProcessed prompt text successfully: "${prompt.substring(0, 100)}..." using local simulation layer.`;
          return {
            text: simText,
            raw: { simulated: true },
            simulated: true
          };
        }
      }
      throw err;
    }
  }
}

/**
 * OpenAI Provider implementing standard Fetch calls for lightweight footprints without massive dependencies
 */
export class OpenAIProvider extends LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODELS.openai) {
    super();
    this.apiKey = apiKey;

    // Ensure the model is in the allowed registry or fall back gracefully
    const allowed = PROVIDER_MODELS.openai.allowed;
    if (!allowed.includes(model)) {
      logger.warn(`Model "${model}" not recognized by OpenAI provider registry. Falling back to default "${DEFAULT_MODELS.openai}".`);
      model = DEFAULT_MODELS.openai;
    }

    this.model = model;
  }

  getName() { return `OpenAI (${this.model})`; }

  async _generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
    const isExplicitSandbox = this.apiKey && this.apiKey.startsWith("sandbox_");
    const isPlaceholderKey = this.apiKey === "your_openai_api_key_here";
    const isDemoMode = process.env.DEMO_MODE === "true";

    const isSandbox = isDemoMode || isExplicitSandbox || isPlaceholderKey;

    if (!this.apiKey && !isDemoMode) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (isSandbox) {
      const sandboxText = `[Simulated OpenAI Output - Sandbox Active]\nSuccessfully processed prompt in simulated OpenAI mode: "${prompt.substring(0, 100)}..."`;
      return {
        text: sandboxText,
        raw: { simulated: true },
        simulated: true
      };
    }

    const messages: any[] = [];
    if (config?.systemInstruction) {
      messages.push({ role: "system", content: config.systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const payload: any = {
      model: this.model,
      messages,
      temperature: config?.temperature ?? 0.7
    };

    if (config?.tools && config.tools.length > 0) {
      payload.tools = config.tools.map((t: any) => ({
        type: "function",
        function: t.function || t
      }));
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API returned error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0]?.message;
    
    let toolCalls: any[] | undefined = undefined;
    if (choice?.tool_calls) {
      toolCalls = choice.tool_calls.map((tc: any) => ({
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments,
        id: tc.id
      }));
    }

    return {
      text: choice?.content || "",
      toolCalls,
      raw: data
    };
  }
}

/**
 * Anthropic Provider supporting Claude models
 */
export class AnthropicProvider extends LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODELS.anthropic) {
    super();
    this.apiKey = apiKey;

    // Ensure the model is in the allowed registry or fall back gracefully
    const allowed = PROVIDER_MODELS.anthropic.allowed;
    if (!allowed.includes(model)) {
      logger.warn(`Model "${model}" not recognized by Anthropic provider registry. Falling back to default "${DEFAULT_MODELS.anthropic}".`);
      model = DEFAULT_MODELS.anthropic;
    }

    this.model = model;
  }

  getName() { return `Anthropic (${this.model})`; }

  async _generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
    const isExplicitSandbox = this.apiKey && this.apiKey.startsWith("sandbox_");
    const isPlaceholderKey = this.apiKey === "your_anthropic_api_key_here";
    const isDemoMode = process.env.DEMO_MODE === "true";

    const isSandbox = isDemoMode || isExplicitSandbox || isPlaceholderKey;

    if (!this.apiKey && !isDemoMode) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    if (isSandbox) {
      const sandboxText = `[Simulated Anthropic Output - Sandbox Active]\nProcessed prompt in mock Anthropic Claude mode: "${prompt.substring(0, 100)}..."`;
      return {
        text: sandboxText,
        raw: { simulated: true },
        simulated: true
      };
    }
    const payload: any = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: config?.maxTokens ?? 2000,
      temperature: config?.temperature ?? 0.7
    };

    if (config?.systemInstruction) {
      payload.system = config.systemInstruction;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API returned error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const contentText = data.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") || "";

    return {
      text: contentText,
      raw: data
    };
  }
}

/**
 * Local Ollama Provider for offline open-source model execution
 */
export class OllamaProvider extends LLMProvider {
  private host: string;
  private model: string;

  constructor(host: string = "http://localhost:11434", model: string = DEFAULT_MODELS.ollama) {
    super();
    this.host = host;

    // Ensure the model is in the allowed registry or fall back gracefully
    const allowed = PROVIDER_MODELS.ollama.allowed;
    if (!allowed.includes(model)) {
      logger.warn(`Model "${model}" not recognized by Ollama provider registry. Falling back to default "${DEFAULT_MODELS.ollama}".`);
      model = DEFAULT_MODELS.ollama;
    }

    this.model = model;
  }

  getName() { return `Ollama (${this.model})`; }

  async _generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
    const systemPrompt = config?.systemInstruction ? `${config.systemInstruction}\n\n` : "";
    const fullPrompt = `${systemPrompt}${prompt}`;

    const res = await fetch(`${this.host}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: config?.temperature ?? 0.7
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama API returned error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return {
      text: data.response || "",
      raw: data
    };
  }
}
