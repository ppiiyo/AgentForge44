/* eslint-disable @typescript-eslint/no-explicit-any -- Ticket #104: Dynamic workflow node execution and field mapping */
import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';
import { ReviewerNode } from '../../nodes/ReviewerNode.js';

export class ReviewerNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const criteria = node.fields.criteria || "";
    const threshold = node.fields.threshold !== undefined ? Number(node.fields.threshold) : 80;
    const maxIterations = Math.max(1, Number(node.fields.maxIterations) || 1);
    const reviewTargetText = typeof context.localValue === 'string' ? context.localValue : JSON.stringify(context.localValue);

    const reviewer = new ReviewerNode({
      criteria,
      threshold,
      maxIterations
    });

    const result = await reviewer.runFeedbackLoop(
      reviewTargetText,
      context.ai,
      "Generate code/text according to previous constraints.",
      'gemini-3.5-flash'
    );

    const runText = result.refinedContent || reviewTargetText;

    context.nodeOutputs[node.id] = runText;
    context.activeValueReference.value = runText;
    context.iterationsCount[node.id] = (context.iterationsCount[node.id] || 0) + (result.score === 100 && result.feedback.includes("simulated") ? 1 : maxIterations);

    context.logs.push({
      nodeId: node.id,
      nodeTitle: node.title,
      status: 'completed',
      input: `Criteria: ${criteria}`,
      output: result.passed 
        ? `Passed audit successfully with score ${result.score}!\n\n${result.feedback}` 
        : `Audit completed maximum cycles. Output refined iteratively with final score ${result.score}:\n\n${result.feedback}`,
      iterationCount: maxIterations,
      duration: Date.now() - context.stepStart
    });
  }
}

