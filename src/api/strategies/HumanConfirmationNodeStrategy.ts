/* eslint-disable @typescript-eslint/no-explicit-any -- Ticket #104: Dynamic workflow node execution and field mapping */
import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';

export class HumanConfirmationNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    // Check if user confirmation/response has already been recorded in nodeOutputs
    if (context.nodeOutputs[node.id] !== undefined) {
      const finalPayload = context.nodeOutputs[node.id];
      context.activeValueReference.value = finalPayload;

      context.logs.push({
        nodeId: node.id,
        nodeTitle: `${node.title} (Human-in-the-Loop)`,
        status: 'completed',
        input: `Resuming execution after Operator Confirmation: "${node.fields.message || "Approval requested."}"`,
        output: `User approved payload action injected successfully: "${finalPayload}"`,
        duration: Date.now() - context.stepStart
      });
      return;
    }

    // Throw special signal to indicate execution should pause
    throw new Error(`PAUSED_FOR_CONFIRMATION:${node.id}`);
  }
}
