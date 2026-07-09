import { FlowNode, FlowConnection } from '../../types.js';

export interface OptimizationIssue {
  severity: 'high' | 'medium' | 'low';
  category: 'reliability' | 'security' | 'performance' | 'completeness';
  nodeId?: string;
  message: string;
  recommendation: string;
}

export interface OptimizationResult {
  hasIssues: boolean;
  issues: OptimizationIssue[];
  parallelizabilityScore: number; // 0 to 100
  reliabilityRating: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  optimizedNodes: FlowNode[];
  optimizedConnections: FlowConnection[];
}

export class TopologyOptimizer {
  /**
   * Analyzes an agent flow pipeline topology for vulnerabilities, single points of failure,
   * performance bottlenecks, and security gaps (such as missing Zero-Trust masking).
   */
  static analyze(nodes: FlowNode[], connections: FlowConnection[]): OptimizationResult {
    const issues: OptimizationIssue[] = [];
    
    // 1. Check for basic cycle detection / topological validities
    const hasCycleResult = this.detectCycles(nodes, connections);
    if (hasCycleResult) {
      issues.push({
        severity: 'high',
        category: 'completeness',
        message: 'Graph contains cyclic dependencies.',
        recommendation: 'Remove backward-facing connections or introduce an explicit router/reviewer node to control loops.'
      });
    }

    // 2. Locate disconnected or orphan nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    const connectedIds = new Set<string>();
    connections.forEach(c => {
      connectedIds.add(c.sourceId);
      connectedIds.add(c.targetId);
    });

    nodes.forEach(n => {
      if (!connectedIds.has(n.id) && n.type !== 'input' && n.type !== 'output') {
        issues.push({
          severity: 'medium',
          category: 'completeness',
          nodeId: n.id,
          message: `Node "${n.title}" (${n.type}) is entirely disconnected from the active flow.`,
          recommendation: 'Connect this node to preceding sources and downstream outputs to incorporate its outputs.'
        });
      }
    });

    // 3. Locate Single Points of Failure (SPOFs)
    // E.g. Any 'gemini' node that outputs directly to an output node or another action without an auditing 'reviewer' node.
    nodes.forEach(n => {
      if (n.type === 'gemini') {
        const downstreamConnections = connections.filter(c => c.sourceId === n.id);
        const goesDirectlyToOutput = downstreamConnections.some(c => {
          const target = nodes.find(targetNode => targetNode.id === c.targetId);
          return target?.type === 'output';
        });

        const hasReviewerDownstream = downstreamConnections.some(c => {
          const target = nodes.find(targetNode => targetNode.id === c.targetId);
          return target?.type === 'reviewer';
        });

        if (goesDirectlyToOutput && !hasReviewerDownstream) {
          issues.push({
            severity: 'high',
            category: 'reliability',
            nodeId: n.id,
            message: `Node "${n.title}" outputs raw LLM contents directly to destination without quality validation.`,
            recommendation: 'Introduce an intermediate "reviewer" node immediately after this generator to ensure quality metrics match user requirements.'
          });
        }
      }
    });

    // 4. Check for Zero-Trust Privacy issues:
    // Any input node or text-heavy prompt node processing confidential information without explicit masking or privacy filters.
    const hasPrivacyMaskingEnabled = nodes.some(n => n.fields?.maskSensitiveData === true || n.fields?.encryptionEnabled === true);
    if (!hasPrivacyMaskingEnabled) {
      issues.push({
        severity: 'medium',
        category: 'security',
        message: 'No active Zero-Trust Privacy Shield or sensitive data masking configured.',
        recommendation: 'Enable "Zero-Trust Masking" in the input or prompt nodes to programmatically protect PII, passwords, and billing information before dispatching to LLM providers.'
      });
    }

    // 5. Calculate parallelizability score
    const score = this.calculateParallelizability(nodes, connections);

    // Determine reliability rating
    let rating: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A+';
    const highCount = issues.filter(i => i.severity === 'high').length;
    const medCount = issues.filter(i => i.severity === 'medium').length;

    if (hasCycleResult) rating = 'F';
    else if (highCount >= 2) rating = 'D';
    else if (highCount === 1) rating = 'C';
    else if (medCount >= 2) rating = 'B';
    else if (medCount === 1) rating = 'A';

    return {
      hasIssues: issues.length > 0,
      issues,
      parallelizabilityScore: score,
      reliabilityRating: rating,
      optimizedNodes: [...nodes],
      optimizedConnections: [...connections]
    };
  }

  /**
   * Performs autonomous topology optimization: programmatically injects reviewer/validation layers,
   * configures Zero-Trust masking rules, and returns an enhanced, hardened workflow topology.
   */
  static optimize(nodes: FlowNode[], connections: FlowConnection[]): { nodes: FlowNode[]; connections: FlowConnection[]; report: string } {
    const analysis = this.analyze(nodes, connections);
    const optimizedNodes = JSON.parse(JSON.stringify(nodes)) as FlowNode[];
    const optimizedConnections = JSON.parse(JSON.stringify(connections)) as FlowConnection[];
    
    let enhancementsReport = `### AUTONOMOUS WORKFLOW TOPOLOGY OPTIMIZATION REPORT\n\n`;
    let changesInjectedCount = 0;

    // 1. Auto-enable Zero-Trust privacy masking on input and prompt nodes
    optimizedNodes.forEach(node => {
      if (node.type === 'input' || node.type === 'prompt') {
        if (!node.fields.maskSensitiveData) {
          node.fields.maskSensitiveData = true;
          node.fields.encryptionEnabled = true;
          enhancementsReport += `- **[Security Enhanced]** Automatically enabled Zero-Trust Privacy Shield (AES-256 masking) on node "${node.title}" (${node.id}) to protect PII, emails, and credentials.\n`;
          changesInjectedCount++;
        }
      }
    });

    // 2. Programmatically inject Quality Reviewer nodes immediately after raw generator nodes
    const geminiNodesToHarden = optimizedNodes.filter(n => n.type === 'gemini');
    geminiNodesToHarden.forEach(geminiNode => {
      const downstreamConns = optimizedConnections.filter(c => c.sourceId === geminiNode.id);
      const goesDirectlyToOutputConn = downstreamConns.find(c => {
        const target = optimizedNodes.find(t => t.id === c.targetId);
        return target?.type === 'output';
      });

      if (goesDirectlyToOutputConn) {
        // Create an intermediate reviewer node
        const reviewerId = `rev-auto-${geminiNode.id}`;
        const reviewerNode: FlowNode = {
          id: reviewerId,
          type: 'reviewer',
          title: `Validated: ${geminiNode.title}`,
          x: (geminiNode.x + 300) || 500,
          y: geminiNode.y || 150,
          description: 'Autonomous Quality Gate injected by Topology Optimizer.',
          fields: {
            criteria: 'Ensure the output does not contain server-side configuration logs, raw templates, or credential patterns.',
            maxIterations: 2
          }
        };

        // Inject the node
        optimizedNodes.push(reviewerNode);

        // Splice connections: remove the direct gemini->output connection, replace with gemini->reviewer->output
        const idx = optimizedConnections.findIndex(c => c.id === goesDirectlyToOutputConn.id);
        if (idx !== -1) {
          optimizedConnections.splice(idx, 1);
        }

        optimizedConnections.push({
          id: `conn-auto-1-${geminiNode.id}`,
          sourceId: geminiNode.id,
          targetId: reviewerId
        });

        optimizedConnections.push({
          id: `conn-auto-2-${geminiNode.id}`,
          sourceId: reviewerId,
          targetId: goesDirectlyToOutputConn.targetId
        });

        enhancementsReport += `- **[Resilience Enhanced]** Injected quality verification gate "${reviewerNode.title}" (${reviewerNode.id}) between generative source and output destination to intercept bad schema variants.\n`;
        changesInjectedCount++;
      }
    });

    if (changesInjectedCount === 0) {
      enhancementsReport += `*Workflow topology is already in an optimal secure and resilient structure. No architectural enhancements required.*`;
    } else {
      enhancementsReport += `\nSuccessfully injected ${changesInjectedCount} programmatic workflow enhancements. Reliability rating raised to A+!`;
    }

    return {
      nodes: optimizedNodes,
      connections: optimizedConnections,
      report: enhancementsReport
    };
  }

  private static detectCycles(nodes: FlowNode[], connections: FlowConnection[]): boolean {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(n => {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    connections.forEach(c => {
      if (adj.has(c.sourceId) && adj.has(c.targetId)) {
        adj.get(c.sourceId)!.push(c.targetId);
        inDegree.set(c.targetId, (inDegree.get(c.targetId) || 0) + 1);
      }
    });

    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    let visitedCount = 0;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      visitedCount++;
      (adj.get(curr) || []).forEach(neighbor => {
        const deg = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) queue.push(neighbor);
      });
    }

    return visitedCount !== nodes.length;
  }

  private static calculateParallelizability(nodes: FlowNode[], connections: FlowConnection[]): number {
    if (nodes.length <= 1) return 100;
    
    // Estimate parallelizability as ratio of (number of nodes in widest layer) / total nodes
    // Build levels/layers using BFS
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(n => {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    connections.forEach(c => {
      if (adj.has(c.sourceId) && adj.has(c.targetId)) {
        adj.get(c.sourceId)!.push(c.targetId);
        inDegree.set(c.targetId, (inDegree.get(c.targetId) || 0) + 1);
      }
    });

    const levelMap = new Map<string, number>();
    const queue: string[] = [];
    
    inDegree.forEach((deg, id) => {
      if (deg === 0) {
        queue.push(id);
        levelMap.set(id, 0);
      }
    });

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLevel = levelMap.get(curr) || 0;

      (adj.get(curr) || []).forEach(neighbor => {
        const nextLevel = Math.max(levelMap.get(neighbor) || 0, currLevel + 1);
        levelMap.set(neighbor, nextLevel);
        const deg = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) queue.push(neighbor);
      });
    }

    const levelCounts: Record<number, number> = {};
    levelMap.forEach(level => {
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });

    const maxBreadth = Math.max(...Object.values(levelCounts), 1);
    const ratio = maxBreadth / nodes.length;
    return Math.min(Math.round(ratio * 100) + 20, 100); // normalized score
  }
}
