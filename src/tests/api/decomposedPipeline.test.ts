import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiNodeStrategy } from '../../api/strategies/GeminiNodeStrategy.js';
import { MissingApiKeyError } from '../../api/errors/AgentErrors.js';
import { ParallelRunner } from '../../api/engine/ParallelRunner.js';
import { TemplateEngine } from '../../api/services/TemplateEngine.js';

describe('GeminiNodeStrategy', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws MissingApiKeyError when active API key is empty/sandbox-only in real environment', async () => {
    const strategy = new GeminiNodeStrategy();
    const node = { id: 'n1', type: 'gemini', fields: { model: 'gemini-3.5-flash' }, title: 'Gemini Node' } as any;
    
    // Empty key context
    const context: any = {
      ai: {},
      apiKey: '',
      globalVariables: {},
      nodeOutputs: {},
      activeValueReference: { value: '' },
      stepStart: Date.now(),
      localValue: 'Test prompt',
      connections: [],
      logs: [],
      iterationsCount: {}
    };

    await expect(strategy.execute(node, context)).rejects.toThrow(MissingApiKeyError);
  });
});

describe('ParallelRunner', () => {
  it('merges outputs from all parallel branches', async () => {
    const context: any = { nodeOutputs: {} };
    
    await ParallelRunner.runAll([
      { nodeId: 'branchA', execute: async () => 'Result A' },
      { nodeId: 'branchB', execute: async () => 'Result B' },
    ], context);

    const merged = ParallelRunner.mergeOutputs(['branchA', 'branchB'], context);
    expect(merged).toEqual({ branchA: 'Result A', branchB: 'Result B' });
  });

  it('throws AggregateError if any parallel branch task fails', async () => {
    const context: any = { nodeOutputs: {} };
    
    await expect(ParallelRunner.runAll([
      { nodeId: 'branchA', execute: async () => 'Result A' },
      { nodeId: 'branchB', execute: async () => { throw new Error('Simulated network fault'); } },
    ], context)).rejects.toThrow(AggregateError);
  });
});

describe('TemplateEngine', () => {
  it('prevents XSS through high-fidelity DOMPurify tag stripping', () => {
    const template = 'Hello {{{name}}} <script>alert("XSS")</script>';
    const data = { name: '<b>Alice</b>' };
    const rendered = TemplateEngine.render(template, data);
    
    // Should strip both the script tag and any HTML tags inside data
    expect(rendered).not.toContain('<script>');
    expect(rendered).not.toContain('<b>');
    expect(rendered).toContain('Hello Alice');
  });

  it('prevents prototype pollution vector injection', () => {
    const template = 'Hello {{name}}';
    const data = JSON.parse('{"name": "Bob", "__proto__": {"admin": true}}');

    expect(() => TemplateEngine.render(template, data)).toThrow(/Forbidden key in template data/);
  });

  it('proves ReDoS resilience on long recursive-like inputs', () => {
    // Generate a long template that would break standard regex-based engines (nesting curl braces)
    const longTemplate = '{{' + 'name'.repeat(100) + '}}';
    const data = { name: 'Alice' };
    
    const start = Date.now();
    TemplateEngine.render(longTemplate, data);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Must be near-instant (typically <1ms)
  });
});
