import { FlowNode, FlowConnection, StepLog, PipelineExecutionResult } from '../types.js';
import { GeminiProvider, OpenAIProvider, LLMProvider } from './providers.js';
import { executeTool } from './tools.js';

export interface WorkflowContext {
  state: Record<string, any>;
  variables: Record<string, string>;
  stepLogs: StepLog[];
  currentNodeId: string | null;
  iterationsCount: Record<string, number>;
}

export class StatefulExecutionEngine {
  private nodes: FlowNode[];
  private connections: FlowConnection[];
  private provider: LLMProvider;

  constructor(nodes: FlowNode[], connections: FlowConnection[]) {
    this.nodes = nodes;
    this.connections = connections;
    
    // Default fallback provider is Gemini, using workspace-secured API keys
    const apiKey = process.env.GEMINI_API_KEY || "";
    this.provider = new GeminiProvider(apiKey, "gemini-3.5-flash");
  }

  /**
   * Sets custom provider for custom API credentials
   */
  setProvider(customProvider: LLMProvider) {
    this.provider = customProvider;
  }

  /**
   * Locates outgoing connections starting from a given Node
   */
  private getTargetConnections(sourceId: string): FlowConnection[] {
    return this.connections.filter(c => c.sourceId === sourceId);
  }

  /**
   * Evaluates conditional branching output or sequential steps
   */
  private getNextNodeId(currentNode: FlowNode, context: WorkflowContext): string | null {
    const targets = this.getTargetConnections(currentNode.id);
    if (targets.length === 0) return null;

    // Critique reviewer branching: 
    // If reviewer failed, target can either loop back or branch to final error handlers
    if (currentNode.type === 'reviewer') {
      const isPassed = context.state[`${currentNode.id}_passed`] === true;
      if (!isPassed) {
        // Find loop-back candidates to prompt or Gemini nodes to heal
        const loopbackIds = this.connections
          .filter(c => c.targetId === currentNode.id)
          .map(c => c.sourceId);
        
        if (loopbackIds.length > 0) {
          // Verify iteration cap
          const currentCount = context.iterationsCount[currentNode.id] || 0;
          const maxCycles = Number(currentNode.fields.maxIterations) || 2;
          if (currentCount < maxCycles) {
            context.iterationsCount[currentNode.id] = currentCount + 1;
            // Loop back to the immediate parent input steps
            return loopbackIds[0];
          }
        }
      }
    }

    // Default sequential routing: return first targeted connection
    return targets[0].targetId;
  }

  /**
   * Run the stateful graph execution lifecycle with total observability
   */
  async runWorkflow(initialVariables: Record<string, string> = {}): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    
    // Locate starting steps (inputs node)
    const startNodes = this.nodes.filter(n => n.type === 'input');
    if (startNodes.length === 0) {
      throw new Error("Invalid Graph Specification: workflows must specify an 'input' entry node.");
    }

    const context: WorkflowContext = {
      state: {},
      variables: { ...initialVariables },
      stepLogs: [],
      currentNodeId: startNodes[0].id,
      iterationsCount: {}
    };

    const visitedCount: Record<string, number> = {};

    while (context.currentNodeId) {
      const node = this.nodes.find(n => n.id === context.currentNodeId);
      if (!node) break;

      // Anti-hanging guard: Prevent infinite un-reviewed cyclic loops
      const visits = visitedCount[node.id] || 0;
      if (visits > 20) {
        console.warn(`[Execution Engine] Circular execution cap triggered on ${node.id}. Interrupting trace pipeline.`);
        break;
      }
      visitedCount[node.id] = visits + 1;

      const stepStart = Date.now();
      context.stepLogs.push({
        nodeId: node.id,
        nodeTitle: node.title,
        status: 'running'
      });

      const currentLogIndex = context.stepLogs.length - 1;

      try {
        if (node.type === 'input') {
          // Read variables mapping from UI configuration
          const fieldsVars = node.fields.variables || [];
          fieldsVars.forEach((v: any) => {
            if (v.key) {
              context.variables[v.key] = v.value;
            }
          });
          context.state['last_output'] = context.variables;

          context.stepLogs[currentLogIndex] = {
            nodeId: node.id,
            nodeTitle: node.title,
            status: 'completed',
            input: JSON.stringify(fieldsVars, null, 2),
            output: JSON.stringify(context.variables, null, 2),
            duration: Date.now() - stepStart
          };

        } else if (node.type === 'prompt') {
          const template = node.fields.template || "";
          let compiledPrompt = template;

          // Hydrate key placeholders from active variables map
          Object.entries(context.variables).forEach(([key, val]) => {
            const pattern = new RegExp(`\\{${key}\\}`, 'g');
            compiledPrompt = compiledPrompt.replace(pattern, String(val));
          });

          context.state['last_output'] = compiledPrompt;
          context.variables['prompt_output'] = compiledPrompt;

          context.stepLogs[currentLogIndex] = {
            nodeId: node.id,
            nodeTitle: node.title,
            status: 'completed',
            input: template,
            output: compiledPrompt,
            duration: Date.now() - stepStart
          };

        } else if (node.type === 'gemini') {
          const promptInput = typeof context.state['last_output'] === 'string'
            ? context.state['last_output']
            : JSON.stringify(context.state['last_output'] || "");

          const systemInstruction = node.fields.systemInstruction || "";
          const temperature = Number(node.fields.temperature) ?? 0.7;

          // If search grounding tools are specified, inject schema mapping
          const extTools: any[] = [];
          if (node.fields.useSearchGrounding) {
            extTools.push({ googleSearch: {} });
          }

          const llmDetails = await this.provider.generate(promptInput, {
            temperature,
            systemInstruction,
            tools: extTools
          });

          context.state['last_output'] = llmDetails.text;
          context.variables['ai_output'] = llmDetails.text;

          context.stepLogs[currentLogIndex] = {
            nodeId: node.id,
            nodeTitle: `${node.title} (${this.provider.getName()})`,
            status: 'completed',
            input: promptInput,
            output: llmDetails.text,
            duration: Date.now() - stepStart
          };

        } else if (node.type === 'reviewer') {
          // Self-critique node analyzing output from previous step
          const previousOutput = typeof context.state['last_output'] === 'string'
            ? context.state['last_output']
            : JSON.stringify(context.state['last_output'] || "");

          const criteria = node.fields.criteria || "";
          
          const criticPrompt = `Validate the generated payload against these requirements:
Requirements: "${criteria}"

Input Payload:
"""
${previousOutput}
"""

If requirements are fully satisfied, respond exactly: PASS
Otherwise, outline missing components and specify: FAIL [explanation details]`;

          const reviewResult = await this.provider.generate(criticPrompt, {
            temperature: 0.1,
            systemInstruction: "You are an automated code quality control auditor."
          });

          const critiqueText = reviewResult.text || "";
          const isPassed = critiqueText.trim().startsWith("PASS");

          context.state[`${node.id}_passed`] = isPassed;
          context.state[`${node.id}_critique`] = critiqueText;
          context.variables['review_critique'] = critiqueText;

          context.stepLogs[currentLogIndex] = {
            nodeId: node.id,
            nodeTitle: node.title,
            status: 'completed',
            input: `Review Criteria: ${criteria}`,
            output: critiqueText,
            duration: Date.now() - stepStart
          };

        } else if (node.type === 'output') {
          const finalPayload = String(context.state['last_output'] || "");
          context.state['pipeline_final_result'] = finalPayload;

          context.stepLogs[currentLogIndex] = {
            nodeId: node.id,
            nodeTitle: node.title,
            status: 'completed',
            input: "Graph Termination",
            output: finalPayload,
            duration: Date.now() - stepStart
          };
        }

      } catch (err: any) {
        context.stepLogs[currentLogIndex] = {
          nodeId: node.id,
          nodeTitle: node.title,
          status: 'failed',
          input: "Execution Error",
          output: err.message || String(err),
          duration: Date.now() - stepStart
        };
        throw err;
      }

      // Compute and step to the subsequent node
      context.currentNodeId = this.getNextNodeId(node, context);
    }

    return {
      logs: context.stepLogs,
      finalResult: String(context.state['pipeline_final_result'] || context.state['last_output'] || "Execution finished with empty return payload."),
      totalDuration: Date.now() - startTime
    };
  }
}
