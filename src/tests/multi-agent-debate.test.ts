import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineExecutor } from '../services/pipeline/PipelineExecutor.js';
import { GoogleGenAI } from '@google/genai';

describe('Multi-Agent Debate & Consensus Node Integration Tests', () => {
  let ai: GoogleGenAI;

  beforeEach(() => {
    ai = new GoogleGenAI({ apiKey: 'sandbox_test_key' });
  });

  it('should successfully execute a pipeline with a multi-agent debate node', async () => {
    const nodes: any[] = [
      {
        id: 'inp-1',
        type: 'input',
        title: 'Inquiry',
        fields: { variables: [{ key: 'topic', value: 'Is Tailwind the best CSS utility framework?' }] }
      },
      {
        id: 'deb-1',
        type: 'debate',
        title: 'Styling Debate',
        fields: {
          topic: 'Is Tailwind the best CSS utility framework?',
          personaPro: 'Utility-First Advocate',
          personaContra: 'Semantic CSS Purist',
          rounds: 2,
          consensusArbiterInstruction: 'Synthesize the utility vs semantic debate into a clear hybrid approach.'
        }
      },
      {
        id: 'out-1',
        type: 'output',
        title: 'Consolidated Insight',
        fields: { value: '' }
      }
    ];

    const connections: any[] = [
      { id: 'conn-1', sourceId: 'inp-1', targetId: 'deb-1' },
      { id: 'conn-2', sourceId: 'deb-1', targetId: 'out-1' }
    ];

    const executor = new PipelineExecutor(nodes, connections, ai);
    const result = await executor.execute();

    expect(result.finalResult).toBeDefined();

    // Verify debate elements exist in the output text
    const finalResultStr = String(result.finalResult);
    expect(finalResultStr).toContain('Utility-First Advocate');
    expect(finalResultStr).toContain('Semantic CSS Purist');
    expect(finalResultStr).toContain('CONSENSUS RESOLUTION');

    // Verify step logs recorded the debate node execution properly
    const debateLog = result.logs.find(log => log.nodeId === 'deb-1');
    expect(debateLog).toBeDefined();
    expect(debateLog?.status).toBe('completed');
  });
});
