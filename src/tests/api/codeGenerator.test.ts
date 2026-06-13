import { describe, it, expect } from 'vitest';
import { CodeGenerator } from '../../api/codeGenerator.js';
import { FlowNode, FlowConnection } from '../../types.js';

describe('CodeGenerator Suite', () => {
  const testNodes: FlowNode[] = [
    {
      id: 'node-in',
      type: 'input',
      title: 'Inputs',
      x: 0,
      y: 0,
      fields: {
        variables: [{ key: 'topic', value: 'Machine Learning', label: 'Topic' }]
      }
    },
    {
      id: 'node-prompt',
      type: 'prompt',
      title: 'Format Prompt',
      x: 0,
      y: 0,
      fields: {
        template: 'Research results for {topic}'
      }
    },
    {
      id: 'node-gemini',
      type: 'gemini',
      title: 'Gemini Generator',
      x: 0,
      y: 0,
      fields: {
        model: 'gemini-1.5-pro',
        temperature: 0.5,
        systemInstruction: 'Be highly formal',
        useSearchGrounding: true
      }
    },
    {
      id: 'node-reviewer',
      type: 'reviewer',
      title: 'Reviewer Critic',
      x: 0,
      y: 0,
      fields: {
        criteria: 'formal format check',
        maxIterations: 3
      }
    },
    {
      id: 'node-router',
      type: 'router',
      title: 'Condition Router',
      x: 0,
      y: 0,
      fields: {
        defaultTargetNodeId: 'node-out-fallback',
        conditions: [
          { type: 'contains', value: 'approved', targetNodeId: 'node-out-main' },
          { type: 'regex', value: '^\\d+$', targetNodeId: 'node-out-numeric' },
          { type: 'json_key', value: 'success', targetNodeId: 'node-out-json' }
        ]
      }
    },
    {
      id: 'node-tool-fetch',
      type: 'tool',
      title: 'Remote API Fetcher',
      x: 0,
      y: 0,
      fields: {
        method: 'POST',
        url: 'https://api.domain.com/data',
        headers: '{"Authorization": "Bearer key"}',
        body: '{"query": "{topic}"}'
      }
    },
    {
      id: 'node-out-fallback',
      type: 'output',
      title: 'Output fallback',
      x: 0,
      y: 0,
      fields: {
        format: 'markdown'
      }
    }
  ];

  const testConnections: FlowConnection[] = [
    { id: 'c1', sourceId: 'node-in', targetId: 'node-prompt' },
    { id: 'c2', sourceId: 'node-prompt', targetId: 'node-gemini' },
    { id: 'c3', sourceId: 'node-gemini', targetId: 'node-reviewer' },
    { id: 'c4', sourceId: 'node-reviewer', targetId: 'node-router' },
    { id: 'c5', sourceId: 'node-router', targetId: 'node-tool-fetch' },
    { id: 'c6', sourceId: 'node-tool-fetch', targetId: 'node-out-fallback' }
  ];

  it('should successfully compile typescript code matching all node types', () => {
    const code = CodeGenerator.generateTypeScript(testNodes, testConnections);

    expect(code).toContain('executeWorkflow');
    expect(code).toContain('GoogleGenAI');
    expect(code).toContain('state["topic"]');
    expect(code).toContain('prompt_node-prompt');
    expect(code).toContain('gemini-1.5-pro');
    expect(code).toContain('Be highly formal');
    expect(code).toContain('googleSearch');
    expect(code).toContain('Reviewing output against criteria');
    expect(code).toContain('routedNodeId = "node-out-main"');
    expect(code).toContain('RegExp(');
    expect(code).toContain('fetch(');
    expect(code).toContain('api.domain.com/data');
  });

  it('should successfully compile Python source matching all node types', () => {
    const code = CodeGenerator.generatePython(testNodes, testConnections);

    expect(code).toContain('def execute_workflow');
    expect(code).toContain('urllib.request');
    expect(code).toContain('state["topic"]');
    expect(code).toContain('prompt_node_prompt');
    expect(code).toContain('gemini-1.5-pro');
    expect(code).toContain('Be highly formal');
    expect(code).toContain('google_search');
    expect(code).toContain('Critical review');
    expect(code).toContain('routed_target = "node-out-main"');
    expect(code).toContain('re.search');
    expect(code).toContain('urllib.request.urlopen');
    expect(code).toContain('api.domain.com/data');
  });
});
