import { LLMProvider, GenerateOptions, LLMResponse } from "../../core/src/providers/types.js";

export class AnthropicProvider implements LLMProvider {
  public name: string;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "claude-3-5-sonnet-latest") {
    this.name = `Anthropic (${model})`;
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key is missing. Please configure ANTHROPIC_API_KEY.");
    }

    const payload: Record<string, any> = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7
    };

    if (options?.systemInstruction) {
      payload.system = options.systemInstruction;
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

  async *stream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key is missing.");
    }

    const payload: Record<string, any> = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
      stream: true
    };

    if (options?.systemInstruction) {
      payload.system = options.systemInstruction;
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
      throw new Error(`Anthropic Stream fetch failed with status ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let partialLine = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialLine + chunk).split("\n");
        partialLine = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith("data: ")) {
            try {
              const dataObj = JSON.parse(cleanLine.slice(6));
              if (dataObj.type === "content_block_delta" && dataObj.delta?.text) {
                yield dataObj.delta.text;
              }
            } catch {
              // Ignore partial stream chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
