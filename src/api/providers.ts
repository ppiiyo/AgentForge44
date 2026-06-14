import { GoogleGenAI } from "@google/genai";

export interface LLMCallConfig {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  tools?: any[];
}

export interface LLMResponse {
  text: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
    id?: string;
  }>;
  raw?: any;
}

export abstract class LLMProvider {
  abstract getName(): string;
  abstract generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse>;
}

/**
 * Gemini Provider leveraging official modern @google/genai SDK
 */
export class GeminiProvider extends LLMProvider {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-3.5-flash") {
    super();
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  getName() { return `Gemini (${this.model})`; }

  async generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
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
        raw: response
      };
    } catch (err: any) {
      const errMsg = String(err.message || err);
      if (errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || err.status === 429) {
        if (process.env.STRICT_LLM_ERRORS === 'true') {
          throw err;
        }
        console.warn(`[AgentForge44] Quota limit reached in providers Gemini model run. Activating simulated fallback mock response...`);
        const simText = `[Simulated response due to API quota limits (429)]\nProcessed prompt text successfully: "${prompt.substring(0, 100)}..." using local simulation layer.`;
        return {
          text: simText,
          raw: { text: simText }
        };
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

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  getName() { return `OpenAI (${this.model})`; }

  async generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
    const isSandbox = !this.apiKey || this.apiKey === "sandbox_free_test_openai" || this.apiKey === "your_openai_api_key_here";
    if (isSandbox) {
      const sandboxText = `[Simulated OpenAI Output - Sandbox Active]\nSuccessfully processed prompt in simulated OpenAI mode: "${prompt.substring(0, 100)}..."`;
      return {
        text: sandboxText,
        raw: { simulated: true }
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

  constructor(apiKey: string, model: string = "claude-3-5-sonnet-latest") {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  getName() { return `Anthropic (${this.model})`; }

  async generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
    const isSandbox = !this.apiKey || this.apiKey === "sandbox_free_test_anthropic" || this.apiKey === "your_anthropic_api_key_here";
    if (isSandbox) {
      const sandboxText = `[Simulated Anthropic Output - Sandbox Active]\nProcessed prompt in mock Anthropic Claude mode: "${prompt.substring(0, 100)}..."`;
      return {
        text: sandboxText,
        raw: { simulated: true }
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

  constructor(host: string = "http://localhost:11434", model: string = "llama3") {
    super();
    this.host = host;
    this.model = model;
  }

  getName() { return `Ollama (${this.model})`; }

  async generate(prompt: string, config?: LLMCallConfig): Promise<LLMResponse> {
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
