import { describe, it, expect } from 'vitest';
import { TopologyOptimizer } from '../services/pipeline/TopologyOptimizer.js';
import { FlowNode, FlowConnection } from '../types.js';

describe('Autonomous Topology Optimizer Engine Tests', () => {
  it('should identify a cycle in a cyclic graph pipeline', () => {
    const nodes: any[] = [
      { id: 'n1', type: 'input', title: 'Node 1' },
      { id: 'n2', type: 'gemini', title: 'Node 2' },
      { id: 'n3', type: 'reviewer', title: 'Node 3' }
    ];

    const connections: any[] = [
      { sourceId: 'n1', targetId: 'n2' },
      { sourceId: 'n2', targetId: 'n3' },
      { sourceId: 'n3', targetId: 'n1' } // Back-edge creating cycle!
    ];

    const analysis = TopologyOptimizer.analyze(nodes, connections);
    expect(analysis.reliabilityRating).toBe('F');
    const cycleIssue = analysis.issues.find(i => i.message.includes('cyclic'));
    expect(cycleIssue).toBeDefined();
    expect(cycleIssue?.severity).toBe('high');
  });

  it('should detect a Single Point of Failure (SPOF) when an LLM node connects directly to output without reviewers', () => {
    const nodes: any[] = [
      { id: 'input', type: 'input', title: 'Input' },
      { id: 'llm', type: 'gemini', title: 'Gemini Generation', fields: {} },
      { id: 'output', type: 'output', title: 'Output' }
    ];

    const connections: any[] = [
      { sourceId: 'input', targetId: 'llm' },
      { sourceId: 'llm', targetId: 'output' } // Raw LLM -> Output (SPOF!)
    ];

    const analysis = TopologyOptimizer.analyze(nodes, connections);
    expect(analysis.reliabilityRating).toBe('C'); // Has high severity issue
    const spofIssue = analysis.issues.find(i => i.category === 'reliability');
    expect(spofIssue).toBeDefined();
    expect(spofIssue?.message).toContain('quality validation');
  });

  it('should programmatically optimize a topology, injecting reviewers and enabling Zero-Trust masking', () => {
    const nodes: any[] = [
      { id: 'input', type: 'input', title: 'Input', fields: {} },
      { id: 'llm', type: 'gemini', title: 'Gemini Generation', fields: {} },
      { id: 'output', type: 'output', title: 'Output' }
    ];

    const connections: any[] = [
      { id: 'c1', sourceId: 'input', targetId: 'llm' },
      { id: 'c2', sourceId: 'llm', targetId: 'output' }
    ];

    const optimized = TopologyOptimizer.optimize(nodes, connections);

    // 1. Zero trust masking auto-enabled
    const inputNode = optimized.nodes.find(n => n.id === 'input');
    expect(inputNode?.fields?.maskSensitiveData).toBe(true);
    expect(inputNode?.fields?.encryptionEnabled).toBe(true);

    // 2. Programmatic reviewer node injected
    const reviewerNode = optimized.nodes.find(n => n.type === 'reviewer');
    expect(reviewerNode).toBeDefined();
    expect(reviewerNode?.id).toContain('rev-auto-llm');

    // 3. Connections re-wired: direct c2 is replaced by llm -> reviewer -> output
    const hasDirectLlmToOutput = optimized.connections.some(c => c.sourceId === 'llm' && c.targetId === 'output');
    expect(hasDirectLlmToOutput).toBe(false);

    const hasLlmToReviewer = optimized.connections.some(c => c.sourceId === 'llm' && c.targetId === reviewerNode?.id);
    expect(hasLlmToReviewer).toBe(true);

    const hasReviewerToOutput = optimized.connections.some(c => c.sourceId === reviewerNode?.id && c.targetId === 'output');
    expect(hasReviewerToOutput).toBe(true);

    expect(optimized.report).toContain('[Security Enhanced]');
    expect(optimized.report).toContain('[Resilience Enhanced]');
  });
});
