import { ExecutionContext } from '../strategies/NodeStrategy.js';

export interface ParallelTask {
  nodeId: string;
  execute: () => Promise<any>;
}

export class ParallelRunner {
  /**
   * Run all parallel tasks concurrently, handle settlement and propagate any errors cleanly.
   */
  static async runAll(
    tasks: ParallelTask[],
    context: ExecutionContext
  ): Promise<void> {
    if (tasks.length === 0) return;

    // Run parallel tasks concurrently
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        const output = await task.execute();
        return { nodeId: task.nodeId, output };
      })
    );

    // Fail-fast error propagation: if any branch fails, throw an AggregateError or first error
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failures.length > 0) {
      const errors = failures.map(f => f.reason);
      throw new AggregateError(errors, `Parallel execution failed with ${errors.length} error(s).`);
    }

    // Explicit output aggregation: store individual outputs back to context outputs dictionary
    for (const result of results as PromiseFulfilledResult<{ nodeId: string; output: any }>[]) {
      context.nodeOutputs[result.value.nodeId] = result.value.output;
    }
  }

  /**
   * Explicitly merge outputs of specific nodes for downstream ingestion.
   */
  static mergeOutputs(
    nodeIds: string[],
    context: ExecutionContext
  ): Record<string, any> {
    const merged: Record<string, any> = {};
    for (const id of nodeIds) {
      const output = context.nodeOutputs[id];
      if (output !== undefined) {
        merged[id] = output;
      }
    }
    return merged;
  }
}
