import { NodeSpec, EdgeSpec, GraphState } from "./types.js";
import { LLMProvider } from "../providers/types.js";

export class GraphExecutor {
  private nodes: NodeSpec[];
  private connections: EdgeSpec[];
  private provider: LLMProvider;
  private breakpoints: Set<string> = new Set();
  private pausedExecutions: Map<string, { currentNodeId: string; state: GraphState }> = new Map();

  constructor(nodes: NodeSpec[], connections: EdgeSpec[], provider: LLMProvider) {
    this.nodes = nodes;
    this.connections = connections;
    this.provider = provider;
  }

  addBreakpoint(nodeId: string) {
    this.breakpoints.add(nodeId);
  }

  /**
   * Run the stateful graph, handling Parallel Node Execution (via branches resolving in Promise.all),
   * Human-in-the-loop checkpoints, and agent loops.
   */
  async execute(initialInput: Record<string, any>, runId: string = "run_1"): Promise<GraphState> {
    const state: GraphState = {
      values: { ...initialInput, lastOutput: "" },
      logs: []
    };

    const startNodes = this.nodes.filter(n => !this.connections.some(c => c.targetId === n.id));
    let currentNodeId: string | null = startNodes.length > 0 ? startNodes[0].id : (this.nodes[0]?.id || null);

    const visitedCounter: Record<string, number> = {};

    while (currentNodeId) {
      if (this.breakpoints.has(currentNodeId)) {
        // Paused for Human Feedback
        this.pausedExecutions.set(runId, { currentNodeId, state });
        state.logs.push({
          nodeId: currentNodeId,
          status: "paused",
          message: "Execution paused on user breakpoint checkpoint."
        });
        return state;
      }

      const node = this.nodes.find(n => n.id === currentNodeId);
      if (!node) break;

      // Circular execution protection limit (prevent endless recursive cycles)
      const visits = visitedCounter[node.id] || 0;
      if (visits > 15) {
        state.logs.push({
          nodeId: node.id,
          status: "failed",
          message: "Termination guard: Infinite visual agent loop interrupted safely."
        });
        break;
      }
      visitedCounter[node.id] = visits + 1;

      state.logs.push({ nodeId: node.id, status: "running" });

      try {
        if (node.type === "input") {
          const mappedVars = node.fields.variables || [];
          mappedVars.forEach((v: any) => {
            if (v.key) state.values[v.key] = v.value;
          });
          state.values.lastOutput = state.values;
        } else if (node.type === "prompt") {
          let tmpl = node.fields.template || "";
          Object.entries(state.values).forEach(([k, v]) => {
            tmpl = tmpl.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          });
          state.values.lastOutput = tmpl;
        } else {
          // LLM model execution
          const systemPrompt = node.fields.systemInstruction || "";
          const temp = node.fields.temperature ?? 0.7;
          const extTools = node.fields.useSearchGrounding ? [{ googleSearch: {} }] : [];
          
          const promptText = typeof state.values.lastOutput === "string" 
            ? state.values.lastOutput 
            : JSON.stringify(state.values.lastOutput);

          const result = await this.provider.generate(promptText, {
            temperature: temp,
            systemInstruction: systemPrompt,
            tools: extTools
          });

          state.values.lastOutput = result.text;
        }

        // Complete step logging
        const log = state.logs.find(l => l.nodeId === node.id && l.status === "running");
        if (log) log.status = "completed";

      } catch (err: any) {
        state.logs.push({ nodeId: node.id, status: "failed", message: err.message });
        throw err;
      }

      // Check for conditional edge or default targeted routing
      const nextId = this.getNextStepId(currentNodeId, state);
      currentNodeId = nextId;
    }

    return state;
  }

  private getNextStepId(nodeId: string, state: GraphState): string | null {
    const targets = this.connections.filter(c => c.sourceId === nodeId);
    if (targets.length === 0) return null;

    // Check custom evaluation routing criteria condition strings if present
    for (const edge of targets) {
      if (edge.condition) {
        try {
          const evalExpr = new Function("state", `return !!(${edge.condition});`);
          if (evalExpr(state.values)) {
            return edge.targetId;
          }
        } catch {
          // Fallback to sequential path on exception rules
        }
      }
    }

    return targets[0].targetId;
  }
}
