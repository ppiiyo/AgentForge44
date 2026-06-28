import { NodeExecutionStrategy } from './NodeStrategy.js';
import { InputNodeStrategy } from './InputNodeStrategy.js';
import { PromptNodeStrategy } from './PromptNodeStrategy.js';
import { GeminiNodeStrategy } from './GeminiNodeStrategy.js';
import { ReviewerNodeStrategy } from './ReviewerNodeStrategy.js';
import { ToolNodeStrategy } from './ToolNodeStrategy.js';
import { MultimodalNodeStrategy } from './MultimodalNodeStrategy.js';
import { RouterNodeStrategy } from './RouterNodeStrategy.js';
import { OutputNodeStrategy } from './OutputNodeStrategy.js';
import { RAGNodeStrategy } from './RAGNodeStrategy.js';
import { HumanConfirmationNodeStrategy } from './HumanConfirmationNodeStrategy.js';
import { PromptOptimizerNodeStrategy } from './PromptOptimizerNodeStrategy.js';
import { WebhookNodeStrategy } from './WebhookNodeStrategy.js';

export class StrategyFactory {
  private static strategies = new Map<string, NodeExecutionStrategy>([
    ['input', new InputNodeStrategy()],
    ['prompt', new PromptNodeStrategy()],
    ['gemini', new GeminiNodeStrategy()],
    ['reviewer', new ReviewerNodeStrategy()],
    ['tool', new ToolNodeStrategy()],
    ['webhook', new WebhookNodeStrategy()],
    ['multimodal', new MultimodalNodeStrategy()],
    ['router', new RouterNodeStrategy()],
    ['output', new OutputNodeStrategy()],
    ['rag', new RAGNodeStrategy()],
    ['vector-search', new RAGNodeStrategy()],
    ['human_confirmation', new HumanConfirmationNodeStrategy()],
    ['prompt_optimizer', new PromptOptimizerNodeStrategy()]
  ]);

  static get(type: string): NodeExecutionStrategy {
    const strategy = this.strategies.get(type.toLowerCase());
    if (!strategy) {
      throw new Error(`Unknown or unimplemented node type strategy: ${type}`);
    }
    return strategy;
  }
}

export * from './NodeStrategy.js';
