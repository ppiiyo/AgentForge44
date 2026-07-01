import { GoogleGenAI } from "@google/genai";
import { FlowNode, FlowConnection, PipelineExecutionResult, StepLog } from '../../types.js';
import { StrategyFactory } from '../../api/strategies/index.js';
import { logger } from '../logger.js';

export interface ExecutorOptions {
  concurrencyLimit?: number;
  apiKey?: string;
  model?: string;
}

export class PipelineExecutor {
  private inDegrees: Map<string, number> = new Map();
  private adjacencyList: Map<string, string[]> = new Map();
  private nodeOutputs: Record<string, any> = {};
  private globalVariables: Record<string, string> = {};
  private activeValueRef = { value: {} as any };
  private logs: StepLog[] = [];
  private concurrencyLimit: number;
  private model: string;

  constructor(
    private nodes: FlowNode[],
    private connections: FlowConnection[],
    private ai: GoogleGenAI,
    options: ExecutorOptions = {}
  ) {
    this.concurrencyLimit = options.concurrencyLimit || 3;
    this.model = options.model || 'gemini-3.5-flash';
  }

  /**
   * Initializes the in-degrees and adjacency list of the graph.
   * Uses Kahn's algorithm structure.
   */
  private initializeGraph() {
    this.inDegrees.clear();
    this.adjacencyList.clear();

    // Initialize all nodes
    for (const node of this.nodes) {
      this.inDegrees.set(node.id, 0);
      this.adjacencyList.set(node.id, []);
    }

    // Populate from connections
    for (const conn of this.connections) {
      const source = conn.sourceId;
      const target = conn.targetId;

      // Handle missing nodes gracefully
      if (!this.inDegrees.has(source) || !this.inDegrees.has(target)) {
        continue;
      }

      const neighbors = this.adjacencyList.get(source) || [];
      neighbors.push(target);
      this.adjacencyList.set(source, neighbors);

      this.inDegrees.set(target, (this.inDegrees.get(target) || 0) + 1);
    }
  }

  /**
   * Run the pipeline using Kahn's topological scheduler with parallel concurrency limits.
   */
  async execute(): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    logger.info(`[KahnPipelineExecutor] Starting execution with concurrency limit: ${this.concurrencyLimit}`);

    this.initializeGraph();

    const readyQueue: string[] = [];
    // Input nodes are our start points (or any node with in-degree 0)
    for (const [nodeId, inDegree] of this.inDegrees.entries()) {
      if (inDegree === 0) {
        readyQueue.push(nodeId);
      }
    }

    if (readyQueue.length === 0 && this.nodes.length > 0) {
      throw new Error("No start nodes with 0 in-degree. Cycle detected or invalid graph!");
    }

    const runningTasks = new Set<Promise<void>>();
    const completedNodes = new Set<string>();

    return new Promise<PipelineExecutionResult>((resolve, reject) => {
      const checkAndRunNext = () => {
        // If we finished everything
        if (completedNodes.size === this.nodes.length) {
          let finalResultText = "";
          const outputs = this.nodes.filter(n => n.type === 'output');
          const completedOutput = outputs.find(n => completedNodes.has(n.id) && this.nodeOutputs[n.id]);
          if (completedOutput) {
            finalResultText = this.nodeOutputs[completedOutput.id] || "";
          } else {
            finalResultText = this.activeValueRef.value || "";
          }

          resolve({
            logs: this.logs,
            finalResult: finalResultText,
            totalDuration: Date.now() - startTime
          });
          return;
        }

        // If no nodes are running and the queue is empty, but we haven't visited all nodes, there is a cycle.
        if (runningTasks.size === 0 && readyQueue.length === 0) {
          reject(new Error("Graph contains a cycle or has unresolved dependencies. Kahn's topological sort failed."));
          return;
        }

        // Spawn as many tasks as possible up to the concurrency limit
        while (readyQueue.length > 0 && runningTasks.size < this.concurrencyLimit) {
          const nextNodeId = readyQueue.shift()!;
          const node = this.nodes.find(n => n.id === nextNodeId);
          if (!node) continue;

          const taskPromise = this.executeNode(node)
            .then(() => {
              completedNodes.add(nextNodeId);
              runningTasks.delete(taskPromise);

              // Decrement in-degree for all downstream neighbors
              const neighbors = this.adjacencyList.get(nextNodeId) || [];
              for (const neighborId of neighbors) {
                const currentInDegree = this.inDegrees.get(neighborId) || 0;
                const newInDegree = currentInDegree - 1;
                this.inDegrees.set(neighborId, newInDegree);

                if (newInDegree === 0) {
                  readyQueue.push(neighborId);
                }
              }

              // Trigger next execution tick
              checkAndRunNext();
            })
            .catch(err => {
              reject(err);
            });

          runningTasks.add(taskPromise);
        }
      };

      // Start the loop
      checkAndRunNext();
    });
  }

  /**
   * Executes a single node with strategy lookup and telemetry logging.
   */
  private async executeNode(node: FlowNode): Promise<void> {
    const stepStart = Date.now();
    logger.debug(`[KahnPipelineExecutor] Executing node: ${node.title} (${node.id})`);

    // Prepare node inputs
    const incoming = this.connections.filter(c => c.targetId === node.id);
    let localValue: any = this.activeValueRef.value;
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
        apiKey: process.env.GEMINI_API_KEY || "",
        globalVariables: this.globalVariables,
        nodeOutputs: this.nodeOutputs,
        activeValueReference: this.activeValueRef,
        stepStart,
        localValue,
        connections: this.connections,
        logs: this.logs,
        iterationsCount: {},
      };

      await strategy.execute(node, context as any);
      this.nodeOutputs[node.id] = this.nodeOutputs[node.id] ?? this.activeValueRef.value;
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
}
