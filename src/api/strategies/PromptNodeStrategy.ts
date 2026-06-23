import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';
import { TemplateEngine } from '../services/TemplateEngine.js';

export class PromptNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const template = node.fields.template || "";

    const sourceObj = typeof context.localValue === 'object' && context.localValue !== null 
      ? { ...context.globalVariables, ...context.localValue } 
      : context.globalVariables;

    // Standardize {variable} to {{variable}} safely to support both legacy and Handlebars syntax
    const normalizedTemplate = template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, '{{$1}}');
    
    const renderedPrompt = TemplateEngine.render(normalizedTemplate, sourceObj);

    context.nodeOutputs[node.id] = renderedPrompt;
    context.activeValueReference.value = renderedPrompt;

    context.logs.push({
      nodeId: node.id,
      nodeTitle: node.title,
      status: 'completed',
      input: template,
      output: renderedPrompt,
      duration: Date.now() - context.stepStart
    });
  }
}
