import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runEvaluationSuite, getPatternTemplate, indexLibraryDocument, searchIndexedLibrary } from '../api/advancedPhase4.js';
import { FlowNode, FlowConnection } from '../types.js';

// Mock GoogleGenAI for a clean offline/cached execution of the Eval Judge
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn().mockImplementation(async (args: any) => {
    // If the prompt contains a specific keyword, we can simulate different behaviors
    return {
      text: JSON.stringify({
        score: 9,
        rationale: "Highly accurate and robust response matched ground truth perfectly."
      })
    };
  });

  class GoogleGenAI {
    models = {
      generateContent: mockGenerateContent
    };
    constructor(config: any) {}
  }

  return { GoogleGenAI };
});

describe('=== Phase 4: Interactive Evaluation Suite & Advanced Features Pipeline ===', () => {

  describe('1. Interactive Evaluation Suite Engine (runEvaluationSuite)', () => {
    // Save original GEMINI_API_KEY
    const oldKey = process.env.GEMINI_API_KEY;

    beforeEach(() => {
      process.env.GEMINI_API_KEY = "dummy-eval-judge-key";
    });

    it('should evaluate the pipeline output using LLM-as-a-Judge and return a structured report', async () => {
      const nodes: FlowNode[] = [
        {
          id: 'n-input',
          type: 'input',
          title: 'Input Step',
          x: 0, y: 0,
          fields: {
            variables: []
          }
        },
        {
          id: 'n-output',
          type: 'output',
          title: 'Output Step',
          x: 100, y: 100,
          fields: {
            value: 'Simulated pipeline output block.'
          }
        }
      ];

      const connections: FlowConnection[] = [
        { id: 'c1', sourceId: 'n-input', targetId: 'n-output' }
      ];

      const testCases = [
        {
          id: 'tc-1',
          name: 'Geography Check',
          query: 'What is the capital of France?',
          expected: 'Paris'
        }
      ];

      const report = await runEvaluationSuite(nodes, connections, testCases);

      expect(report).toBeDefined();
      expect(report.avgScore).toBeGreaterThanOrEqual(0);
      expect(report.avgScore).toBeLessThanOrEqual(10);
      expect(report.items.length).toBe(1);
      expect(report.items[0].expected).toBe('Paris');
      expect(report.items[0].score).toBe(9);
      expect(report.items[0].rationale).toContain('Highly accurate');
    });

    it('should gracefully degrade back to local non-LLM mock scorer if GEMINI_API_KEY is empty', async () => {
      // Temporarily clear key to force substring fallback branch
      process.env.GEMINI_API_KEY = "";

      const nodes: FlowNode[] = [
        {
          id: 'n-input',
          type: 'input',
          title: 'Input Step',
          x: 0, y: 0,
          fields: {}
        },
        {
          id: 'n-output',
          type: 'output',
          title: 'Output Step',
          x: 100, y: 100,
          fields: {
            value: 'Capital matches Paris fine.'
          }
        }
      ];

      const connections: FlowConnection[] = [
        { id: 'c1', sourceId: 'n-input', targetId: 'n-output' }
      ];

      const testCases = [
        {
          id: 'tc-2',
          name: 'Geography Paris Fallback',
          query: 'Capital',
          expected: 'Paris'
        }
      ];

      const report = await runEvaluationSuite(nodes, connections, testCases);

      expect(report.items.length).toBe(1);
      expect(report.items[0].score).toBeTypeOf('number');
      expect(report.items[0].rationale).toContain('Mock evaluation completed');

      // Restore key
      process.env.GEMINI_API_KEY = "dummy-eval-judge-key";
    });
  });

  describe('2. Pre-Packaged Industry Multi-Agent Flow Designs Generator (getPatternTemplate)', () => {
    it('should generate a robust supervisor multi-agent flow with structural correctness', () => {
      const template = getPatternTemplate('supervisor');

      expect(template.nodes).toBeDefined();
      expect(template.connections).toBeDefined();
      expect(template.nodes.length).toBeGreaterThan(2);

      // Verify essential components of supervisor layout exist
      const hasSupervisor = template.nodes.some(n => n.id === 'node-supervisor' && n.type === 'gemini');
      const hasCoder = template.nodes.some(n => n.id === 'node-coder' && n.type === 'gemini');
      const hasReviewer = template.nodes.some(n => n.id === 'node-reviewer' && n.type === 'reviewer');

      expect(hasSupervisor).toBe(true);
      expect(hasCoder).toBe(true);
      expect(hasReviewer).toBe(true);

      // Verify connection sequence
      expect(template.connections.some(c => c.sourceId === 'node-supervisor' && c.targetId === 'node-coder')).toBe(true);
      expect(template.connections.some(c => c.sourceId === 'node-coder' && c.targetId === 'node-reviewer')).toBe(true);
    });

    it('should generate a structured debate consensus flow with the correct role properties', () => {
      const template = getPatternTemplate('debate');

      expect(template.nodes).toBeDefined();
      expect(template.connections).toBeDefined();
      expect(template.nodes.length).toBeGreaterThan(2);

      const hasOptimist = template.nodes.some(n => n.id === 'deb-optimist' && n.type === 'gemini');
      const hasPessimist = template.nodes.some(n => n.id === 'deb-pessimist' && n.type === 'gemini');
      const hasReferee = template.nodes.some(n => n.id === 'deb-referee' && n.type === 'gemini');

      expect(hasOptimist).toBe(true);
      expect(hasPessimist).toBe(true);
      expect(hasReferee).toBe(true);

      // Connection sequence verification
      expect(template.connections.some(c => c.sourceId === 'deb-input' && c.targetId === 'deb-optimist')).toBe(true);
      expect(template.connections.some(c => c.sourceId === 'deb-optimist' && c.targetId === 'deb-pessimist')).toBe(true);
      expect(template.connections.some(c => c.sourceId === 'deb-pessimist' && c.targetId === 'deb-referee')).toBe(true);
    });
  });

  describe('3. Document Loader and Simple Index Store for Semantic RAG (indexLibraryDocument & searchIndexedLibrary)', () => {
    it('should handle indexLibraryDocument with empty inputs gracefully', async () => {
      const res = await indexLibraryDocument("   ", "Empty Source");
      expect(res.success).toBe(false);
      expect(res.chunkCount).toBe(0);
    });

    it('should index active document content into the store and allow high-performance retrieval', async () => {
      const docContent = "AgentForge44 achieves enterprise integration using local indices and semantic retrievers for multi-agent logic.";
      const indexResult = await indexLibraryDocument(docContent, "Validation Doc");

      expect(indexResult.success).toBe(true);
      expect(indexResult.chunkCount).toBeGreaterThan(0);

      // Simple lookup
      const searchResult = await searchIndexedLibrary("enterprise integration", 2);
      expect(searchResult.chunks).toBeDefined();
      expect(searchResult.chunks.length).toBeGreaterThan(0);
      expect(searchResult.chunks[0].text).toContain("AgentForge44");
    });
  });

});
