import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';
import { generateWithRetry, generateSimulatedResponse } from '../services/RetryService.js';
import { MissingApiKeyError } from '../errors/AgentErrors.js';

export class GeminiNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const promptText = typeof context.localValue === 'string' ? context.localValue : JSON.stringify(context.localValue);
    const model = node.fields.model || 'gemini-3.5-flash';
    const temp = node.fields.temperature !== undefined ? Number(node.fields.temperature) : 0.7;
    const systemInstruction = node.fields.systemInstruction || "";
    const useSearchGrounding = !!node.fields.useSearchGrounding;

    const apiKey = context.apiKey || "";
    const isSandbox = !apiKey || apiKey === "sandbox_free_test_gemini" || apiKey === "your_gemini_api_key_here";

    // Enforce fail-fast checks as per instructions: throw descriptive error if API key is not configured or sandbox requested in real environment
    if (!isSandbox && !process.env.GEMINI_API_KEY) {
      throw new MissingApiKeyError("Gemini", "Please make sure GEMINI_API_KEY environment variable is configured on your server dashboard.");
    }
    // Also, if the test is looking for a MissingApiKeyError when using the sandbox key
    if (apiKey === 'sandbox_free_test_gemini' || apiKey === 'your_gemini_api_key_here') {
      // Wait, let's look at the vitest spec:
      // "throws MissingApiKeyError for sandbox_free_test key" -> Ah! The user requested this exact behavior in 6.2:
      // "throws MissingApiKeyError when API key is not set", "throws MissingApiKeyError for sandbox_free_test key"
      // Wait! If the user requested this, let's check:
      // if (apiKey === "sandbox_free_test_gemini" || !apiKey) { throw new MissingApiKeyError("Gemini"); }
      // But wait! If we do that, does it break the original sandbox simulation behavior for standard runs?
      // Wait, let's see: in 6.2 user specifically requested:
      // "throws MissingApiKeyError for sandbox_free_test key" inside GeminiNodeStrategy.test.ts!
      // Let's implement it to raise MissingApiKeyError for sandbox_free_test_gemini or when API key is not set.
      // Wait, let's check: "isSandbox = !apiKey || apiKey === "sandbox_free_test_gemini"".
      // If we throw MissingApiKeyError, then any sandbox test will throw. That's exactly what is requested in the Phase 6 test description!
      // Let's implement it!
    }

    let responseText = "";
    let resolvedModelName = model;
    const groundingSources: Array<{ title: string; uri: string }> = [];

    if (isSandbox) {
      // Wait, if it is sandbox, let's check if we should throw an error or do simulation.
      // The test in 6.2 says:
      // "throws MissingApiKeyError for sandbox_free_test key" and "throws MissingApiKeyError when API key is not set".
      // Let's implement this to throw MissingApiKeyError!
      throw new MissingApiKeyError("Gemini", "Sandbox key or empty key is not allowed in production execution.");
    } else {
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
