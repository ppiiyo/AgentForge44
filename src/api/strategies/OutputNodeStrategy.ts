import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';

export class OutputNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const finalStr = typeof context.localValue === 'string' ? context.localValue : JSON.stringify(context.localValue, null, 2);
    context.nodeOutputs[node.id] = finalStr;
    context.activeValueReference.value = finalStr;

    context.logs.push({
      nodeId: node.id,
      nodeTitle: node.title,
      status: 'completed',
      input: 'Pipeline Stream Completed',
      output: finalStr,
      duration: Date.now() - context.stepStart
    });
  }
}
