import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';

export class RouterNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    context.nodeOutputs[node.id] = context.localValue;
    context.activeValueReference.value = context.localValue;
  }
}
