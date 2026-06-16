import { FlowNode, FlowConnection, StepLog, PipelineExecutionResult } from '../types.js';
import { GeminiProvider, OpenAIProvider, LLMProvider } from './providers.js';
import { executeTool } from './tools.js';
import { searchIndexedLibrary } from './advancedPhase4.js';

function getValueByDotPath(obj: any, pathStr: string): any {
  if (!obj || !pathStr) return undefined;
  const keys = pathStr.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

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

    // If router node, return evaluated condition route ID
    if (currentNode.type === 'router') {
      return context.state[`${currentNode.id}_next_id`] || null;
    }

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

    const stepLogs: StepLog[] = [];

    // Detect back-edges (loop-backs) using DFS starting from inputs to allow standard parallel scheduling
    const backEdges = new Set<string>(); // "sourceId->targetId"
    const visitedDFS = new Set<string>();
    const pathDFS = new Set<string>();
    
    const findBackEdges = (nodeId: string) => {
      visitedDFS.add(nodeId);
      pathDFS.add(nodeId);
      
      const outgoing = this.connections.filter(c => c.sourceId === nodeId);
      for (const conn of outgoing) {
        if (pathDFS.has(conn.targetId)) {
          backEdges.add(`${conn.sourceId}->${conn.targetId}`);
        } else if (!visitedDFS.has(conn.targetId)) {
          findBackEdges(conn.targetId);
        }
      }
      pathDFS.delete(nodeId);
    };
    
    startNodes.forEach(node => findBackEdges(node.id));

    // Dynamic state values
    const nodeOutputs: Record<string, any> = {};
    const globalVariables: Record<string, string> = { ...initialVariables };
    const completedNodes = new Set<string>();
    const activatedNodes = new Set<string>(startNodes.map(n => n.id));
    const executedCount: Record<string, number> = {};
    const iterationsCount: Record<string, number> = {};

    // For backward-compatibility logic, track a single activeValue
    let activeValue: any = {};

    // Traversal Reachability Helper to reset downstream nodes upon looping back
    const getReachableNodes = (startId: string, visited = new Set<string>()): Set<string> => {
      visited.add(startId);
      const outgoing = this.connections.filter(c => c.sourceId === startId);
      for (const conn of outgoing) {
        if (!visited.has(conn.targetId)) {
          getReachableNodes(conn.targetId, visited);
        }
      }
      return visited;
    };

    let safetyCeiling = 500; // global safety ticker limits
    while (activatedNodes.size > 0 && safetyCeiling-- > 0) {
      // 1. Find all active nodes that are ready to run (all non-backedge predecessors completed)
      const eligibleNodes: FlowNode[] = [];
      for (const nodeId of activatedNodes) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // Parents/Predecessors check excluding back-edges
        const predecessors = this.connections
          .filter(c => c.targetId === nodeId && !backEdges.has(`${c.sourceId}->${c.targetId}`))
          .map(c => c.sourceId);

        const allPredecessorsCompleted = predecessors.every(pId => completedNodes.has(pId));
        if (allPredecessorsCompleted) {
          eligibleNodes.push(node);
        }
      }

      if (eligibleNodes.length === 0) {
        break;
      }

      const currentActiveValue = activeValue;

      // 2. Execute all eligible nodes CONCURRENTLY for High-Throughput Parallel Execution
      const promises = eligibleNodes.map(async (node) => {
        // Fast path track execution frequency
        executedCount[node.id] = (executedCount[node.id] || 0) + 1;
        if (executedCount[node.id] > 15) {
          throw new Error(`Execution limit exceeded: Node "${node.title}" executed more than 15 times. Circular loop circuit breaker triggered.`);
        }

        const stepStart = Date.now();

        // Collect input arguments from parents
        const incoming = this.connections.filter(c => c.targetId === node.id);
        let localValue: any = currentActiveValue;
        if (incoming.length === 1) {
          localValue = nodeOutputs[incoming[0].sourceId];
        } else if (incoming.length > 1) {
          let mergedVars: Record<string, any> = {};
          let combinedString = "";
          incoming.forEach(c => {
            const val = nodeOutputs[c.sourceId];
            if (typeof val === 'object' && val !== null) {
              mergedVars = { ...mergedVars, ...val };
            } else if (typeof val === 'string') {
              combinedString = val;
            }
          });
          if (Object.keys(mergedVars).length > 0) {
            if (combinedString) {
              mergedVars['lastOutput'] = combinedString;
            }
            localValue = mergedVars;
          } else {
            localValue = combinedString;
          }
        }

        try {
          if (node.type === 'input') {
            const variablesMap: Record<string, string> = {};
            const variables = node.fields.variables || [];
            variables.forEach((v: { key: string; value: string }) => {
              if (v.key) {
                variablesMap[v.key] = v.value;
                globalVariables[v.key] = v.value;
              }
            });
            nodeOutputs[node.id] = variablesMap;
            activeValue = variablesMap;

            stepLogs.push({
              nodeId: node.id,
              nodeTitle: node.title,
              status: 'completed',
              input: JSON.stringify(variables, null, 2),
              output: JSON.stringify(variablesMap, null, 2),
              duration: Date.now() - stepStart
            });

          } else if (node.type === 'prompt') {
            const template = node.fields.template || "";
            let renderedPrompt = template;

            // Replace tags {placeholder} from local values & global variables
            const sourceObj = typeof localValue === 'object' && localValue !== null ? { ...globalVariables, ...localValue } : globalVariables;
            Object.entries(sourceObj).forEach(([k, v]) => {
              const regex = new RegExp(`\\{${k}\\}`, 'g');
              renderedPrompt = renderedPrompt.replace(regex, String(v));
            });

            nodeOutputs[node.id] = renderedPrompt;
            activeValue = renderedPrompt;

            stepLogs.push({
              nodeId: node.id,
              nodeTitle: node.title,
              status: 'completed',
              input: template,
              output: renderedPrompt,
              duration: Date.now() - stepStart
            });

          } else if (node.type === 'gemini') {
            const promptText = typeof localValue === 'string' ? localValue : JSON.stringify(localValue);
            const systemInstruction = node.fields.systemInstruction || "";
            const temperature = node.fields.temperature !== undefined ? Number(node.fields.temperature) : 0.7;

            const extTools: any[] = [];
            if (node.fields.useSearchGrounding) {
              extTools.push({ googleSearch: {} });
            }

            const llmDetails = await this.provider.generate(promptText, {
              temperature,
              systemInstruction,
              tools: extTools
            });

            nodeOutputs[node.id] = llmDetails.text;
            activeValue = llmDetails.text;

            stepLogs.push({
              nodeId: node.id,
              nodeTitle: `${node.title} (${this.provider.getName()})`,
              status: 'completed',
              input: promptText,
              output: llmDetails.text,
              duration: Date.now() - stepStart
            });

          } else if (node.type === 'reviewer') {
            const criteria = node.fields.criteria || "";
            const previousOutput = typeof localValue === 'string' ? localValue : JSON.stringify(localValue);

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

            nodeOutputs[node.id] = previousOutput; // reviewer passes input as output
            activeValue = previousOutput;

            stepLogs.push({
              nodeId: node.id,
              nodeTitle: node.title,
              status: 'completed',
              input: `Review Criteria: ${criteria}`,
              output: critiqueText,
              duration: Date.now() - stepStart
            });

          } else if (node.type === 'tool') {
            const urlRaw = node.fields.url || "";
            const method = node.fields.method || "GET";
            const headersRaw = node.fields.headers || "{}";
            const bodyRaw = node.fields.body || "";

            let url = urlRaw;
            let body = bodyRaw;
            let headersStr = headersRaw;

            const substitute = (text: string) => {
              let out = text;
              const sourceObj = { ...globalVariables, lastOutput: typeof localValue === 'string' ? localValue : JSON.stringify(localValue) };
              Object.entries(sourceObj).forEach(([k, v]) => {
                const r1 = new RegExp(`\\{${k}\\}`, 'g');
                out = out.replace(r1, String(v));
                const r2 = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
                out = out.replace(r2, String(v));
              });
              return out;
            };

            url = substitute(url);
            body = substitute(body);
            headersStr = substitute(headersStr);

            let headers: Record<string, string> = { "Content-Type": "application/json" };
            try {
              if (headersStr.trim().startsWith("{")) {
                headers = { ...headers, ...JSON.parse(headersStr) };
              }
            } catch {}

            const fetchOptions: any = { method, headers };
            if (method !== 'GET' && body) {
              fetchOptions.body = body;
            }

            let responseText = "";
            let responseStatus = 250;
            try {
              const fetchRes = await fetch(url, fetchOptions);
              responseStatus = fetchRes.status;
              responseText = await fetchRes.text();
            } catch (err: any) {
              throw new Error(`HTTP Tool node failed: ${err.message || String(err)}`);
            }

            nodeOutputs[node.id] = responseText;
            activeValue = responseText;

            stepLogs.push({
              nodeId: node.id,
              nodeTitle: `${node.title} (${method} ${responseStatus})`,
              status: 'completed',
              input: `URL: ${url}\nBody: ${body || 'None'}`,
              output: responseText,
              duration: Date.now() - stepStart
            });

          } else if (node.type === 'rag') {
            const limit = Number(node.fields.limit) || 3;
            let searchQueryRaw = node.fields.searchQuery || "";
            let searchQuery = searchQueryRaw;

            Object.entries(globalVariables).forEach(([key, val]) => {
              const pattern1 = new RegExp(`\\{${key}\\}`, 'g');
              searchQuery = searchQuery.replace(pattern1, String(val));
              const pattern2 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
              searchQuery = searchQuery.replace(pattern2, String(val));
            });

            if (!searchQuery.trim() || searchQuery === searchQueryRaw) {
              const lastOutput = typeof localValue === 'string' ? localValue : JSON.stringify(localValue);
              if (lastOutput) {
                searchQuery = lastOutput.substring(0, 100);
              }
            }

            const searchStart = Date.now();
            const searchRes = await searchIndexedLibrary(searchQuery, limit);
            const chunks = searchRes.chunks || [];
            const latency = Date.now() - searchStart;

            const aggregatedContextText = chunks.map(c => `[Source: ${c.source}]\n${c.text}`).join('\n\n');

            nodeOutputs[node.id] = aggregatedContextText;
            activeValue = aggregatedContextText;
            node.fields.ragResults = chunks;

            stepLogs.push({
              nodeId: node.id,
              nodeTitle: node.title,
              status: 'completed',
              input: `Vector DB Query: "${searchQuery}"`,
              output: `Found ${chunks.length} chunks (Search Latency: ${latency}ms).\n\n${aggregatedContextText || "No context references found in indexed documents."}`,
              duration: Date.now() - stepStart
            });

           } else if (node.type === 'router') {
            nodeOutputs[node.id] = localValue;
            activeValue = localValue;

          } else if (node.type === 'output') {
            const finalStr = typeof localValue === 'string' ? localValue : JSON.stringify(localValue, null, 2);
            nodeOutputs[node.id] = finalStr;
            activeValue = finalStr;

            stepLogs.push({
              nodeId: node.id,
              nodeTitle: node.title,
              status: 'completed',
              input: 'Graph Termination',
              output: finalStr,
              duration: Date.now() - stepStart
            });
          }
        } catch (err: any) {
          stepLogs.push({
            nodeId: node.id,
            nodeTitle: node.title,
            status: 'failed',
            input: 'Execution Interrupted',
            output: err.message || String(err),
            duration: Date.now() - stepStart
          });
          throw err;
        }
      });

      // Resolve current level execution
      await Promise.all(promises);

      // Update activeValue to be the output of the last completed node in this level
      if (eligibleNodes.length > 0) {
        const lastEligibleNode = eligibleNodes[eligibleNodes.length - 1];
        activeValue = nodeOutputs[lastEligibleNode.id];
      }

      // 3. Complete currently processed nodes & calculate successor activations
      for (const completedNode of eligibleNodes) {
        completedNodes.add(completedNode.id);
        activatedNodes.delete(completedNode.id);

        if (completedNode.type === 'router') {
          const inputPayload = typeof nodeOutputs[completedNode.id] === 'string'
            ? nodeOutputs[completedNode.id]
            : JSON.stringify(nodeOutputs[completedNode.id] || "");

          const conditions = completedNode.fields.conditions || [];
          const defaultTargetId = completedNode.fields.defaultTargetNodeId || "";
          let selectedTargetId: string | null = null;

          for (const cond of conditions) {
            if (cond.type === 'contains') {
              if (inputPayload.toLowerCase().includes(cond.value.toLowerCase())) {
                selectedTargetId = cond.targetNodeId;
                break;
              }
            } else if (cond.type === 'regex') {
              try {
                const pattern = cond.value || "";
                const isSafe = !(/(\([^\)]*[\+\*][^\)]*\))[\+\*]/.test(pattern)) && !(/(\([^\)]*\{\d+,?\d*\}\))\{\d+,?\d*\}/.test(pattern));
                if (isSafe) {
                  const regex = new RegExp(pattern, 'i');
                  if (regex.test(inputPayload)) {
                    selectedTargetId = cond.targetNodeId;
                    break;
                  }
                }
              } catch {}
            } else if (cond.type === 'json_key') {
              try {
                const parsedJson = JSON.parse(inputPayload);
                const valOfKey = getValueByDotPath(parsedJson, cond.value);
                if (valOfKey !== undefined && valOfKey !== null && valOfKey !== false) {
                  selectedTargetId = cond.targetNodeId;
                  break;
                }
              } catch {}
            }
          }

          const finalNextNodeId = selectedTargetId || defaultTargetId;
          if (finalNextNodeId) {
            activatedNodes.add(finalNextNodeId);
          }

          stepLogs.push({
            nodeId: completedNode.id,
            nodeTitle: completedNode.title,
            status: 'completed',
            input: inputPayload,
            output: `Routed to node: ${finalNextNodeId || 'None'} based on condition match: ${selectedTargetId ? 'Matched Condition' : 'Default Target'}`,
            duration: 0
          });

        } else if (completedNode.type === 'reviewer') {
          const incomingPredecessors = this.connections
            .filter(c => c.targetId === completedNode.id)
            .map(c => c.sourceId);

          const logsForThisNode = stepLogs.filter(l => l.nodeId === completedNode.id);
          const latestLog = logsForThisNode[logsForThisNode.length - 1];
          const isPassed = latestLog && latestLog.output && latestLog.output.includes("PASS");

          if (!isPassed && incomingPredecessors.length > 0) {
            const loopHeadId = incomingPredecessors[0];
            const currentCount = iterationsCount[completedNode.id] || 0;
            const maxCycles = Number(completedNode.fields.maxIterations) || 2;

            if (currentCount < maxCycles) {
              iterationsCount[completedNode.id] = currentCount + 1;
              console.warn(`[Execution Engine] Reviewer failed, loop-back #${currentCount + 1} to node: ${loopHeadId}`);

              // Reset completion status of loop head and descendants
              const loopContainedNodes = getReachableNodes(loopHeadId);
              for (const reachableId of loopContainedNodes) {
                completedNodes.delete(reachableId);
                activatedNodes.delete(reachableId);
              }
              activatedNodes.add(loopHeadId);
              continue;
            }
          }

          // Passed or exceeded cycles limit - normal target activation
          const targets = this.connections.filter(c => c.sourceId === completedNode.id);
          targets.forEach(t => activatedNodes.add(t.targetId));

        } else {
          const targets = this.connections.filter(c => c.sourceId === completedNode.id);
          targets.forEach(t => activatedNodes.add(t.targetId));
        }
      }
    }

    const outputNodes = this.nodes.filter(n => n.type === 'output');
    let finalResultText = "";
    if (outputNodes.length > 0 && nodeOutputs[outputNodes[0].id]) {
      finalResultText = String(nodeOutputs[outputNodes[0].id]);
    } else {
      finalResultText = typeof activeValue === 'string' ? activeValue : JSON.stringify(activeValue, null, 2);
    }

    return {
      logs: stepLogs,
      finalResult: finalResultText,
      totalDuration: Date.now() - startTime
    };
  }
}
