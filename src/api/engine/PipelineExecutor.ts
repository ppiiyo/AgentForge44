import { GoogleGenAI } from "@google/genai";
import { FlowNode, FlowConnection, PipelineExecutionResult, StepLog } from '../../types.js';
import { MAX_EXECUTION_STEPS } from '../execution.js';
import { routeNode } from '../../nodes/RouterNode.js';
import { CycleDetector } from './CycleDetector.js';
import { ParallelRunner, ParallelTask } from './ParallelRunner.js';
import { StrategyFactory } from '../strategies/index.js';
import { TelemetryService } from '../services/TelemetryService.js';

export class PipelineExecutor {
  private backEdges = new Set<string>();
  private nodeOutputs: Record<string, any> = {};
  private globalVariables: Record<string, string> = {};
  private completedNodes = new Set<string>();
  private activatedNodes = new Set<string>();
  private executedCount: Record<string, number> = {};
  private iterationsCount: Record<string, number> = {};
  private activeValueRef = { value: {} as any };
  private logs: StepLog[] = [];
  private stepCount = 0;

  constructor(
    private nodes: FlowNode[],
    private connections: FlowConnection[],
    private ai: GoogleGenAI,
    private apiKey: string
  ) {}

  /**
   * Traversal Reachability Helper to reset downstream nodes upon looping back
   */
  private getReachableNodes(startId: string, visited = new Set<string>()): Set<string> {
    visited.add(startId);
    const outgoing = this.connections.filter(c => c.sourceId === startId);
    for (const conn of outgoing) {
      if (!visited.has(conn.targetId)) {
        this.getReachableNodes(conn.targetId, visited);
      }
    }
    return visited;
  }

  /**
   * Execute the multi-agent graph with parallel-scheduling and circuit breaker protection.
   */
  async execute(): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const telemetry = new TelemetryService();

    // Find start nodes (input nodes)
    const inputNodes = this.nodes.filter(n => n.type === 'input');
    if (inputNodes.length === 0) {
      throw new Error("No Input node found in the workflow!");
    }

    // Detect back-edges (loop-backs) starting from inputs
    this.backEdges = CycleDetector.detectBackEdges(
      inputNodes.map(n => n.id),
      this.connections
    );

    // Initial activation
    inputNodes.forEach(n => this.activatedNodes.add(n.id));

    let safetyCeiling = 500;
    while (this.activatedNodes.size > 0 && safetyCeiling-- > 0) {
      // 1. Identify currently ready/eligible nodes in parallel-level sorting
      const eligibleNodes: FlowNode[] = [];
      for (const nodeId of this.activatedNodes) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const predecessors = this.connections
          .filter(c => c.targetId === nodeId && !this.backEdges.has(`${c.sourceId}->${c.targetId}`))
          .map(c => c.sourceId);

        const allPredecessorsCompleted = predecessors.every(pId => this.completedNodes.has(pId));
        if (allPredecessorsCompleted) {
          eligibleNodes.push(node);
        }
      }

      if (eligibleNodes.length === 0) {
        break;
      }

      const currentActiveValue = this.activeValueRef.value;

      // 2. Prepare parallel task definitions
      const tasks: ParallelTask[] = eligibleNodes.map((node) => {
        return {
          nodeId: node.id,
          execute: async () => {
            this.stepCount++;
            if (this.stepCount >= Math.floor(MAX_EXECUTION_STEPS * 0.8)) {
              console.warn(`Warning: Execution step count has reached 80% of the limit (${this.stepCount}/${MAX_EXECUTION_STEPS}).`);
            }
            if (this.stepCount > MAX_EXECUTION_STEPS) {
              throw new Error(`Max execution steps (${MAX_EXECUTION_STEPS}) reached. Possible infinite loop detected.`);
            }

            this.executedCount[node.id] = (this.executedCount[node.id] || 0) + 1;
            if (this.executedCount[node.id] > 15) {
              throw new Error(`Execution limit exceeded: Node "${node.title}" executed more than 15 times. Circular loop circuit breaker triggered.`);
            }

            const stepStart = Date.now();

            // Collect inputs from parent connectors
            const incoming = this.connections.filter(c => c.targetId === node.id);
            let localValue: any = currentActiveValue;
            if (incoming.length === 1) {
              localValue = this.nodeOutputs[incoming[0].sourceId];
            } else if (incoming.length > 1) {
              let mergedVars: Record<string, any> = {};
              let combinedString = "";
              incoming.forEach(c => {
                const val = this.nodeOutputs[c.sourceId];
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
              const strategy = StrategyFactory.get(node.type);
              const context = {
                ai: this.ai,
                apiKey: this.apiKey,
                globalVariables: this.globalVariables,
                nodeOutputs: this.nodeOutputs,
                activeValueReference: this.activeValueRef,
                stepStart,
                localValue,
                connections: this.connections,
                logs: this.logs,
                iterationsCount: this.iterationsCount,
              };

              await telemetry.traceNode(node, () => strategy.execute(node, context));
              return this.nodeOutputs[node.id];
            } catch (err: any) {
              this.logs.push({
                nodeId: node.id,
                nodeTitle: node.title,
                status: 'failed',
                input: 'Execution Interrupted',
                output: err.message || String(err),
                duration: Date.now() - stepStart,
              });
              throw err;
            }
          }
        };
      });

      // 3. Dispatch parallel execution concurrently with thread-safe outputs isolation
      const stepContext: any = {
        nodeOutputs: this.nodeOutputs,
      };
      await ParallelRunner.runAll(tasks, stepContext);

      // Thread-safe update: update activeValueRef.value only after ALL concurrent executions complete
      if (eligibleNodes.length > 0) {
        const lastEligibleNode = eligibleNodes[eligibleNodes.length - 1];
        this.activeValueRef.value = this.nodeOutputs[lastEligibleNode.id];
      }

      // 4. Update graph traversal progress and trigger downstream transitions
      for (const completedNode of eligibleNodes) {
        this.completedNodes.add(completedNode.id);
        this.activatedNodes.delete(completedNode.id);

        if (completedNode.type === 'router') {
          const inputPayload = typeof this.nodeOutputs[completedNode.id] === 'string'
            ? this.nodeOutputs[completedNode.id]
            : JSON.stringify(this.nodeOutputs[completedNode.id] || "");

          let finalNextNodeId = "";
          let matched = false;
          try {
            finalNextNodeId = await routeNode(completedNode, inputPayload);
            matched = finalNextNodeId !== (completedNode.fields.defaultTargetNodeId || "");
          } catch (err: any) {
            console.error("[Agent Run] Router node error:", err.message);
            finalNextNodeId = completedNode.fields.defaultTargetNodeId || "";
          }

          if (finalNextNodeId) {
            this.activatedNodes.add(finalNextNodeId);
          }

          this.logs.push({
            nodeId: completedNode.id,
            nodeTitle: completedNode.title,
            status: 'completed',
            input: inputPayload,
            output: `Routed to node: ${finalNextNodeId || 'None'} based on condition match: ${matched ? 'Matched Condition' : 'Default Target'}`,
            duration: 0,
          });

        } else if (completedNode.type === 'reviewer') {
          const incomingPredecessors = this.connections
            .filter(c => c.targetId === completedNode.id)
            .map(c => c.sourceId);

          const logsForThisNode = this.logs.filter(l => l.nodeId === completedNode.id);
          const latestLog = logsForThisNode[logsForThisNode.length - 1];
          const isPassed = latestLog && latestLog.output && latestLog.output.includes("Passed audit");

          if (!isPassed && incomingPredecessors.length > 0) {
            const loopHeadId = incomingPredecessors[0];
            console.warn(`[AgentForge44 Executor] Critique loop-back re-injects to loop head node: ${loopHeadId}`);

            const loopContainedNodes = this.getReachableNodes(loopHeadId);
            for (const reachableId of loopContainedNodes) {
              this.completedNodes.delete(reachableId);
              this.activatedNodes.delete(reachableId);
            }
            this.activatedNodes.add(loopHeadId);
          } else {
            const targets = this.connections.filter(c => c.sourceId === completedNode.id);
            targets.forEach(t => this.activatedNodes.add(t.targetId));
          }

        } else {
          const targets = this.connections.filter(c => c.sourceId === completedNode.id);
          targets.forEach(t => this.activatedNodes.add(t.targetId));
        }
      }
    }

    // Resolve final consolidated payload text
    const outputNodes = this.nodes.filter(n => n.type === 'output');
    let finalResultText = "";
    if (outputNodes.length > 0 && this.nodeOutputs[outputNodes[0].id]) {
      finalResultText = String(this.nodeOutputs[outputNodes[0].id]);
    } else {
      finalResultText = typeof this.activeValueRef.value === 'string'
        ? this.activeValueRef.value
        : JSON.stringify(this.activeValueRef.value, null, 2);
    }

    return {
      logs: this.logs,
      finalResult: finalResultText,
      totalDuration: Date.now() - startTime,
    };
  }
}
