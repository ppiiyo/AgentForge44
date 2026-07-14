/* eslint-disable @typescript-eslint/no-explicit-any -- Ticket #104: Dynamic workflow node execution and field mapping */
import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';
import { generateWithRetry } from '../../services/retry/RetryService.js';

export class PromptOptimizerNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const originalDraft = node.fields.originalPrompt || typeof context.localValue === 'string' ? context.localValue : "Write a prompt.";
    const targetPersona = node.fields.targetPersona || "Advanced Reasoning AI Specialist";

    const systemPrompt = `You are a world-class Prompt Engineer specializing in Chain-of-Thought (CoT), few-shot framing, and cognitive architectures.
Optimize the following user draft prompt into a professional, highly reliable CoT prompt.

INSTRUCTIONS:
1. Establish a clear, contextually rich expert persona for the model: "${targetPersona}".
2. Frame instructions using precise Markdown subheadings (### Constraints, ### Objective, ### Few-Shot Demonstration).
3. Explicitly construct step-by-step thinking instructions ("Think aloud in <thinking> tags before producing direct replies").
4. Add clear input/output templates.

Your output must be the OPTIMIZED system prompt itself. Do not write normal conversation messages; start immediately with the prompt.`;

    let optimizedText = "";
    try {
      const responsePair = await generateWithRetry(
        context.ai,
        "gemini-3.5-flash",
        `Original draft to optimize:\n\n"""\n${originalDraft}\n"""`,
        { systemInstruction: systemPrompt }
      );
      optimizedText = responsePair.response.text || "";
    } catch {
      optimizedText = `### SYSTEM ARCHITECT INSTRUCTIONS\n` +
        `Role: ${targetPersona}\n\n` +
        `### Objective\n` +
        `Solve tasks with structured step-by-step logical decomposition.\n\n` +
        `### Constraints\n` +
        `- State assumptions clearly before writing code or solutions\n` +
        `- Follow few-shot COT format: <thinking> -> <final_answer>\n\n` +
        `### Original Request Optimization Context\n` +
        `Target prompt draft: ${originalDraft}`;
    }

    node.fields.optimizedPrompt = optimizedText; // cache in the node for UI inspection fields
    context.nodeOutputs[node.id] = optimizedText;
    context.activeValueReference.value = optimizedText;

    context.logs.push({
      nodeId: node.id,
      nodeTitle: node.title,
      status: 'completed',
      input: originalDraft,
      output: optimizedText,
      duration: Date.now() - context.stepStart
    });
  }
}
