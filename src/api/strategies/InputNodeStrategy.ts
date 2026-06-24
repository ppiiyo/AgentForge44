/* eslint-disable @typescript-eslint/no-explicit-any -- Ticket #104: Dynamic workflow node execution and field mapping */
import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';

export class InputNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const variablesMap: Record<string, string> = {};
    const variables = node.fields.variables || [];
    variables.forEach((v: { key: string; value?: string; val?: string }) => {
      if (v.key) {
        const value = v.value !== undefined ? v.value : (v.val !== undefined ? v.val : "");
        variablesMap[v.key] = value;
        context.globalVariables[v.key] = value;
      }
    });
    context.nodeOutputs[node.id] = variablesMap;
    context.activeValueReference.value = variablesMap;

    context.logs.push({
      nodeId: node.id,
      nodeTitle: node.title,
      status: 'completed',
      input: JSON.stringify(variables, null, 2),
      output: JSON.stringify(variablesMap, null, 2),
      duration: Date.now() - context.stepStart
    });
  }
}
