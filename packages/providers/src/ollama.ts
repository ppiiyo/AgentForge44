import { LLMProvider, GenerateOptions, LLMResponse } from "../../core/src/providers/types.js";

export class OllamaProvider implements LLMProvider {
  public name: string;
  private host: string;
  private model: string;

  constructor(host: string = "http://localhost:11434", model: string = "llama3") {
    this.name = `Ollama (${model})`;
    this.host = host;
    this.model = model;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    const systemPrompt = options?.systemInstruction ? `${options.systemInstruction}\n\n` : "";
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
          temperature: options?.temperature ?? 0.7
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

  async *stream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const systemPrompt = options?.systemInstruction ? `${options.systemInstruction}\n\n` : "";
    const fullPrompt = `${systemPrompt}${prompt}`;

    const res = await fetch(`${this.host}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.7
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama stream returned error status: ${res.status}`);
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

          try {
            const dataObj = JSON.parse(cleanLine);
            if (dataObj.response) {
              yield dataObj.response;
            }
          } catch {
            // Ignore incomplete line splits
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
