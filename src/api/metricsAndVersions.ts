import fs from 'fs';
import path from 'path';
import { StepLog, FlowNode, FlowConnection } from '../types.js';

const DATA_DIR = path.join(process.cwd(), 'projects', '.metadata');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const METRICS_FILE = path.join(DATA_DIR, 'metrics_executions.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'graph_versions.json');

// Interface mirror from src/types.ts
export interface MetricsExecutionLog {
  id: string;
  graphId: string;
  graphName: string;
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'failed';
  totalTokens: number;
  totalCostUsd: number;
  totalLatencyMs: number;
  errorMessage?: string;
  nodeExecutions: NodeExecution[];
}

export interface NodeExecution {
  id: string;
  executionId: string;
  nodeId: string;
  nodeType: string;
  tokensUsed: number;
  costUsd: number;
  latencyMs: number;
  inputPreview: string;
  outputPreview: string;
}

export interface GraphVersion {
  id: string;
  graphId: string;
  versionNumber: number;
  createdAt: string;
  author: string;
  snapshot: {
    name: string;
    nodes: FlowNode[];
    connections: FlowConnection[];
  };
  commitMessage: string;
  diffSummary: string;
}

/**
 * Load helper with safe fallbacks
 */
function readJsonFile<T>(filePath: string, defaultVal: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.error(`Failed to read metadata file: ${filePath}`, err);
  }
  return defaultVal;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to write metadata file: ${filePath}`, err);
  }
}

/**
 * Price rules for Step 3:
 * GPT-4o: $2.5 / 1M input, $10.0 / 1M output
 * Gemini: $0.075 / 1M input, $0.300 / 1M output
 * Claude / Anthropic: $3.00 / 1M input, $15.00 / 1M output
 * Ollama / Tools: $0.00
 */
export class MetricsCollector {
  static estimateTokens(text: string): number {
    if (!text) return 0;
    // Standard char-per-token heuristic (4 chars ≈ 1 token)
    return Math.ceil(text.length / 4);
  }

  static calculateNodeCost(nodeType: string, input: string, output: string): { tokens: number; cost: number } {
    const inputTokens = this.estimateTokens(input);
    const outputTokens = this.estimateTokens(output);
    const totalTokens = inputTokens + outputTokens;

    let inputRate_1M = 0;
    let outputRate_1M = 0;

    if (nodeType === 'gemini') {
      inputRate_1M = 0.075;
      outputRate_1M = 0.30;
    } else if (nodeType === 'reviewer') {
      // Reviewer runs Gemini 3.5 internally
      inputRate_1M = 0.075;
      outputRate_1M = 0.30;
    } else if (nodeType === 'prompt' || nodeType === 'input' || nodeType === 'output' || nodeType === 'router' || nodeType === 'rag') {
      // Local pipeline operations, negligible cost
      return { tokens: 0, cost: 0 };
    } else {
      // General or openai proxy
      inputRate_1M = 2.50;
      outputRate_1M = 10.00;
    }

    const cost = (inputTokens / 1_000_000) * inputRate_1M + (outputTokens / 1_000_000) * outputRate_1M;
    return { tokens: totalTokens, cost: Number(cost.toFixed(6)) };
  }

  static async logExecution(
    graphId: string,
    graphName: string,
    status: 'success' | 'failed',
    startTime: number,
    stepLogs: StepLog[],
    errorMessage?: string
  ): Promise<MetricsExecutionLog> {
    const records = readJsonFile<MetricsExecutionLog[]>(METRICS_FILE, []);
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const finishedTime = Date.now();
    
    let totalTokens = 0;
    let totalCostUsd = 0;

    const nodeExecutions: NodeExecution[] = stepLogs.map((log) => {
      const inputStr = typeof log.input === 'string' ? log.input : JSON.stringify(log.input || '');
      const outputStr = typeof log.output === 'string' ? log.output : JSON.stringify(log.output || '');
      
      const { tokens, cost } = this.calculateNodeCost(log.nodeId.includes('gemini') ? 'gemini' : log.nodeId.includes('reviewer') ? 'reviewer' : 'local', inputStr, outputStr);
      
      totalTokens += tokens;
      totalCostUsd += cost;

      return {
        id: `node_exec_${Math.random().toString(36).substr(2, 9)}`,
        executionId,
        nodeId: log.nodeId,
        nodeType: log.nodeId.split('-')[0] || 'unknown',
        tokensUsed: tokens,
        costUsd: cost,
        latencyMs: log.duration || 0,
        inputPreview: inputStr.substring(0, 200),
        outputPreview: outputStr.substring(0, 200)
      };
    });

    const newLog: MetricsExecutionLog = {
      id: executionId,
      graphId,
      graphName,
      startedAt: new Date(startTime).toISOString(),
      finishedAt: new Date(finishedTime).toISOString(),
      status,
      totalTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(6)),
      totalLatencyMs: finishedTime - startTime,
      errorMessage,
      nodeExecutions
    };

    records.push(newLog);
    // Prune very old logs to keep container footprint clean (keep last 500 records)
    if (records.length > 500) {
      records.shift();
    }
    writeJsonFile(METRICS_FILE, records);
    return newLog;
  }

  static getSummary(periodDays: number = 7): any {
    const records = readJsonFile<MetricsExecutionLog[]>(METRICS_FILE, []);
    const cutoffTime = Date.now() - periodDays * 24 * 60 * 60 * 1000;

    const filtered = records.filter(r => new Date(r.startedAt).getTime() >= cutoffTime);

    const totalRuns = filtered.length;
    const successfulRuns = filtered.filter(r => r.status === 'success').length;
    const successRate = totalRuns > 0 ? Number(((successfulRuns / totalRuns) * 100).toFixed(1)) : 0;
    const totalCost = filtered.reduce((acc, r) => acc + r.totalCostUsd, 0);
    const avgLatency = filtered.length > 0 ? Math.round(filtered.reduce((acc, r) => acc + r.totalLatencyMs, 0) / filtered.length) : 0;

    // Daily historical aggregation for graphs
    const dailyMap: Record<string, { date: string; runs: number; cost: number; tokens: number }> = {};
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { date: key, runs: 0, cost: 0, tokens: 0 };
    }

    filtered.forEach(r => {
      const dateKey = r.startedAt.split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].runs++;
        dailyMap[dateKey].cost += r.totalCostUsd;
        dailyMap[dateKey].tokens += r.totalTokens;
      }
    });

    const dailyMetrics = Object.values(dailyMap);

    return {
      totalRuns,
      successRate,
      totalCostUsd: Number(totalCost.toFixed(4)),
      averageLatencyMs: avgLatency,
      daily: dailyMetrics,
      executions: filtered.sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 30)
    };
  }

  static getExecutionsByGraph(graphId: string): MetricsExecutionLog[] {
    const records = readJsonFile<MetricsExecutionLog[]>(METRICS_FILE, []);
    return records
      .filter(r => r.graphId === graphId)
      .sort((a,b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  static getCostBreakdown(): any {
    const records = readJsonFile<MetricsExecutionLog[]>(METRICS_FILE, []);
    let geminiCost = 0;
    let reviewerCost = 0;
    let toolCost = 0;

    records.forEach(r => {
      r.nodeExecutions.forEach(n => {
        if (n.nodeType === 'gemini') geminiCost += n.costUsd;
        else if (n.nodeType === 'reviewer') reviewerCost += n.costUsd;
        else toolCost += n.costUsd;
      });
    });

    return [
      { name: 'Gemini Agent Node', cost: Number(geminiCost.toFixed(5)) },
      { name: 'Self-Critique Reviewer', cost: Number(reviewerCost.toFixed(5)) },
      { name: 'Http Tool Node', cost: Number(toolCost.toFixed(5)) }
    ];
  }
}

/**
 * Version Management Rules for Step 4 (Git-like rollback and commits)
 */
export class VersionManager {
  static getVersions(graphId: string): GraphVersion[] {
    const allVersions = readJsonFile<GraphVersion[]>(VERSIONS_FILE, []);
    return allVersions
      .filter(v => v.graphId === graphId)
      .sort((a,b) => b.versionNumber - a.versionNumber);
  }

  static commit(
    graphId: string,
    message: string,
    author: string,
    snapshot: any
  ): GraphVersion {
    const allVersions = readJsonFile<GraphVersion[]>(VERSIONS_FILE, []);
    const graphVersions = allVersions.filter(v => v.graphId === graphId);
    const nextVerNum = graphVersions.length > 0 ? Math.max(...graphVersions.map(v => v.versionNumber)) + 1 : 1;

    // Build diff estimation
    let diffSummary = "Initial workspace version";
    if (graphVersions.length > 0) {
      const prevVer = graphVersions.sort((a,b) => b.versionNumber - a.versionNumber)[0];
      const prevNodes = prevVer.snapshot.nodes || [];
      const currentNodes = snapshot.nodes || [];
      const added = currentNodes.filter(cn => !prevNodes.some(pn => pn.id === cn.id)).length;
      const deleted = prevNodes.filter(pn => !currentNodes.some(cn => cn.id === pn.id)).length;
      const modified = currentNodes.filter(cn => {
        const matching = prevNodes.find(pn => pn.id === cn.id);
        return matching && JSON.stringify(matching.fields) !== JSON.stringify(cn.fields);
      }).length;

      diffSummary = `Added: ${added}, Removed: ${deleted}, Edited: ${modified}`;
    }

    const newVersion: GraphVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      graphId,
      versionNumber: nextVerNum,
      createdAt: new Date().toISOString(),
      author: author || "Forge Developer",
      snapshot: {
        name: snapshot.name || "Default Project",
        nodes: snapshot.nodes || [],
        connections: snapshot.connections || []
      },
      commitMessage: message || `Incremental commit ver ${nextVerNum}`,
      diffSummary
    };

    allVersions.push(newVersion);
    writeJsonFile(VERSIONS_FILE, allVersions);
    return newVersion;
  }

  static rollback(graphId: string, versionId: string): any {
    const allVersions = readJsonFile<GraphVersion[]>(VERSIONS_FILE, []);
    const targetVersion = allVersions.find(v => v.id === versionId && v.graphId === graphId);
    if (!targetVersion) {
      throw new Error(`Version id ${versionId} not found for graph ${graphId}`);
    }

    // Save current as rolling snapshot rollback version
    const projectsDir = path.join(process.cwd(), 'projects');
    const safeName = graphId.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const filePath = path.join(projectsDir, `${safeName}.json`);

    const payload = {
      name: targetVersion.snapshot.name,
      nodes: targetVersion.snapshot.nodes,
      connections: targetVersion.snapshot.connections,
      savedAt: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return targetVersion;
  }

  static computeDiff(versionIdA: string, versionIdB: string): any {
    const allVersions = readJsonFile<GraphVersion[]>(VERSIONS_FILE, []);
    const verA = allVersions.find(v => v.id === versionIdA);
    const verB = allVersions.find(v => v.id === versionIdB);

    if (!verA || !verB) {
      return { addedIds: [], deletedIds: [], modifiedIds: [] };
    }

    const nodesA = verA.snapshot.nodes || [];
    const nodesB = verB.snapshot.nodes || [];

    const addedIds = nodesB.filter(nb => !nodesA.some(na => na.id === nb.id)).map(n => n.id);
    const deletedIds = nodesA.filter(na => !nodesB.some(nb => nb.id === na.id)).map(n => n.id);
    const modifiedIds = nodesB.filter(nb => {
      const match = nodesA.find(na => na.id === nb.id);
      return match && (match.title !== nb.title || JSON.stringify(match.fields) !== JSON.stringify(nb.fields));
    }).map(n => n.id);

    return { addedIds, deletedIds, modifiedIds };
  }
}
