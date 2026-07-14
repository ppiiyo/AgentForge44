/* eslint-disable @typescript-eslint/no-explicit-any -- Ticket #104: Dynamic workflow node execution and field mapping */
import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';
import { generateWithRetry, generateSimulatedResponse } from '../../services/retry/RetryService.js';
import { MissingApiKeyError } from '../errors/AgentErrors.js';

export class GeminiNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const promptText = typeof context.localValue === 'string' ? context.localValue : JSON.stringify(context.localValue);
    const model = node.fields.model || 'gemini-3.5-flash';
    const temp = node.fields.temperature !== undefined ? Number(node.fields.temperature) : 0.7;
    const systemInstruction = node.fields.systemInstruction || "";
    const useSearchGrounding = !!node.fields.useSearchGrounding;

    const apiKey = context.apiKey || "";
    const isSandbox = !apiKey || apiKey === "sandbox_free_test_gemini" || apiKey === "your_gemini_api_key_here" || apiKey.startsWith("sandbox_") || apiKey.includes("sandbox");

    const envKey = process.env.GEMINI_API_KEY || "";
    const isEnvSandbox = !envKey || envKey === "sandbox_free_test_gemini" || envKey === "your_gemini_api_key_here" || envKey.startsWith("sandbox_") || envKey.includes("sandbox");

    // Enforce fail-fast checks: throw descriptive error if real key is expected but process.env.GEMINI_API_KEY is sandbox/unconfigured
    if (!isSandbox && isEnvSandbox) {
      throw new MissingApiKeyError("Gemini", "Please make sure GEMINI_API_KEY environment variable is configured on your server dashboard.");
    }

    let responseText = "";
    let resolvedModelName = model;
    const groundingSources: Array<{ title: string; uri: string }> = [];

    const config: any = {
      temperature: temp,
      systemInstruction: systemInstruction || undefined,
    };
    if (useSearchGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const { response, resolvedModel } = await generateWithRetry(context.ai, model, promptText, config);
    responseText = response.text || "";
    resolvedModelName = resolvedModel;

    const metadata = response.candidates?.[0]?.groundingMetadata;
    if (metadata?.groundingChunks) {
      metadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.title && chunk.web?.uri) {
          groundingSources.push({
            title: chunk.web.title,
            uri: chunk.web.uri
          });
        }
      });
    }

    context.nodeOutputs[node.id] = responseText;
    context.activeValueReference.value = responseText;

    context.logs.push({
      nodeId: node.id,
      nodeTitle: `${node.title} (${resolvedModelName})`,
      status: 'completed',
      input: promptText,
      output: responseText,
      groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
      duration: Date.now() - context.stepStart
    });
  }
}
