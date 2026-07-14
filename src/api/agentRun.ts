import { GoogleGenAI } from "@google/genai";
import { FlowNode, FlowConnection, PipelineExecutionResult } from "../types.js";
import { validateDatabaseConfig } from "./db.js";
import { PipelineExecutor } from "./engine/PipelineExecutor.js";
import { classifyLLMError } from "../services/retry/RetryService.js";

// Run pre-flight database config check immediately upon evaluation of this runner module
validateDatabaseConfig(process.env.DB_TYPE || 'sqlite', process.env.DATABASE_URL || '');

// Keep error classifier exported to preserve 100% test compatibility
export { classifyLLMError };

/**
 * Execute the multi-agent graph with parallel-scheduling and circuit breaker protection.
 * Central coordinator for KostromAi44's execution engine.
 */
export async function executePipeline(
  nodes: FlowNode[],
  connections: FlowConnection[],
  customGeminiApiKey?: string
): Promise<PipelineExecutionResult> {
  const apiKey = customGeminiApiKey || process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const executor = new PipelineExecutor(nodes, connections, ai, apiKey);
  return executor.execute();
}
