import { GoogleGenAI } from "@google/genai";
import { LLMProvider, GenerateOptions, LLMResponse } from "../../core/src/providers/types.js";

export class GeminiProvider implements LLMProvider {
  public name: string;
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-3.5-flash") {
    this.name = `Gemini (${model})`;
    this.model = model;
    this.ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<LLMResponse> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        temperature: options?.temperature ?? 0.7,
        systemInstruction: options?.systemInstruction,
        tools: options?.tools
      }
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
  }

  async *stream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const list = await this.ai.models.generateContentStream({
      model: this.model,
      contents: prompt,
      config: {
        temperature: options?.temperature ?? 0.7,
        systemInstruction: options?.systemInstruction,
        tools: options?.tools
      }
    });

    for await (const chunk of list) {
      yield chunk.text || "";
    }
  }
}
