import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';

export class HumanConfirmationNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const message = node.fields.message || "Approval requested.";
    const approvedValue = node.fields.approvedValue || "Approved payload action.";

    const finalPayload = approvedValue;
    context.nodeOutputs[node.id] = finalPayload;
    context.activeValueReference.value = finalPayload;

    context.logs.push({
      nodeId: node.id,
      nodeTitle: `${node.title} (Human-in-the-Loop)`,
      status: 'completed',
      input: `Requested Operator Confirmation: "${message}"`,
      output: `User approved payload action injected successfully: "${finalPayload}"`,
      duration: Date.now() - context.stepStart
    });
  }
}
