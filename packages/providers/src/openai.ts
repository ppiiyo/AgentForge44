import { LLMProvider, GenerateOptions, LLMResponse } from "../../core/src/providers/types.js";

export class OpenAIProvider implements LLMProvider {
  public name: string;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.name = `OpenAI (${model})`;
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is missing. Please configure OPENAI_API_KEY.");
    }

    const messages: any[] = [];
    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const payload: Record<string, any> = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.7
    };

    if (options?.tools && options.tools.length > 0) {
      payload.tools = options.tools.map((t: any) => ({
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

  async *stream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is missing.");
    }

    const messages: any[] = [];
    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        stream: true
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI Stream fetch failed with status ${res.status}`);
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
          if (!cleanLine || cleanLine === "data: [DONE]") continue;

          if (cleanLine.startsWith("data: ")) {
            try {
              const dataObj = JSON.parse(cleanLine.slice(6));
              const text = dataObj.choices?.[0]?.delta?.content;
              if (text) {
                yield text;
              }
            } catch {
              // Ignore malformed chunk rows gracefully
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
