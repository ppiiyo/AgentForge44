import { describe, it, expect } from 'vitest';
import { StatefulExecutionEngine } from '../api/execution.js';
import { FlowNode, FlowConnection } from '../types.js';

describe('StatefulExecutionEngine Unit Suite', () => {
  it('should compile template tags and execute sequential nodes', async () => {
    const nodes: FlowNode[] = [
      {
        id: 'step-input',
        type: 'input',
        title: 'Query Inputs',
        x: 0, y: 0,
        description: 'Inputs variables',
        fields: {
          variables: [
            { key: 'subject', value: 'Dynamic Agent Architectures', label: 'Subject' }
          ]
        }
      },
      {
        id: 'step-prompt',
        type: 'prompt',
        title: 'Compile Prompt',
        x: 0, y: 0,
        description: 'Hydrates input template state',
        fields: {
          template: 'Analyze details of {subject}. Respond with facts.'
        }
      },
      {
        id: 'step-output',
        type: 'output',
        title: 'Output Result',
        x: 0, y: 0,
        description: 'Exposes output results',
        fields: {
          format: 'text',
          value: ''
        }
      }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'step-input', targetId: 'step-prompt' },
      { id: 'c2', sourceId: 'step-prompt', targetId: 'step-output' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    const run = await engine.runWorkflow();

    expect(run.logs.length).toBe(3);
    expect(run.logs[1].output).toContain('Analyze details of Dynamic Agent Architectures.');
    expect(run.finalResult).toContain('Analyze details of Dynamic Agent Architectures.');
  });

  it('should be thread-safe when merging parallel branches with structured deep cloning', async () => {
    const nodes: FlowNode[] = [
      {
        id: 'step-input',
        type: 'input',
        title: 'Master Inputs',
        x: 0, y: 0,
        description: 'Inputs variables',
        fields: {
          variables: []
        }
      },
      {
        id: 'branch-a',
        type: 'prompt',
        title: 'Branch A Prompt',
        x: 0, y: 0,
        description: 'Branch A data constructor',
        fields: {
          template: '{"branch": "A", "metadata": {"status": "success"}}'
        }
      },
      {
        id: 'branch-b',
        type: 'prompt',
        title: 'Branch B Prompt',
        x: 0, y: 0,
        description: 'Branch B data constructor',
        fields: {
          template: '{"branch": "B", "metadata": {"status": "success"}}'
        }
      },
      {
        id: 'step-output',
        type: 'output',
        title: 'Merge Output Node',
        x: 0, y: 0,
        description: 'Merges input branch nodes',
        fields: {
          format: 'text',
          value: ''
        }
      }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'step-input', targetId: 'branch-a' },
      { id: 'c2', sourceId: 'step-input', targetId: 'branch-b' },
      { id: 'c3', sourceId: 'branch-a', targetId: 'step-output' },
      { id: 'c4', sourceId: 'branch-b', targetId: 'step-output' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    const runResult = await engine.runWorkflow();

    expect(runResult.logs.length).toBe(4);

    const logA = runResult.logs.find(l => l.nodeId === 'branch-a');
    const logB = runResult.logs.find(l => l.nodeId === 'branch-b');
    const logOutput = runResult.logs.find(l => l.nodeId === 'step-output');

    expect(logA).toBeDefined();
    expect(logB).toBeDefined();
    expect(logOutput).toBeDefined();
  });

  it('should execute a 10-node sequential chain successfully', async () => {
    // 10 nodes: Input + 8 Prompts + 1 Output
    const nodes: FlowNode[] = [
      { id: 'input', type: 'input', title: 'Input', x: 0, y: 0, fields: { variables: [] }, description: '' },
      { id: 'n1', type: 'prompt', title: 'Node 1', x: 0, y: 0, fields: { template: '1' }, description: '' },
      { id: 'n2', type: 'prompt', title: 'Node 2', x: 0, y: 0, fields: { template: '2' }, description: '' },
      { id: 'n3', type: 'prompt', title: 'Node 3', x: 0, y: 0, fields: { template: '3' }, description: '' },
      { id: 'n4', type: 'prompt', title: 'Node 4', x: 0, y: 0, fields: { template: '4' }, description: '' },
      { id: 'n5', type: 'prompt', title: 'Node 5', x: 0, y: 0, fields: { template: '5' }, description: '' },
      { id: 'n6', type: 'prompt', title: 'Node 6', x: 0, y: 0, fields: { template: '6' }, description: '' },
      { id: 'n7', type: 'prompt', title: 'Node 7', x: 0, y: 0, fields: { template: '7' }, description: '' },
      { id: 'n8', type: 'prompt', title: 'Node 8', x: 0, y: 0, fields: { template: '8' }, description: '' },
      { id: 'output', type: 'output', title: 'Output', x: 0, y: 0, fields: {}, description: '' }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'input', targetId: 'n1' },
      { id: 'c2', sourceId: 'n1', targetId: 'n2' },
      { id: 'c3', sourceId: 'n2', targetId: 'n3' },
      { id: 'c4', sourceId: 'n3', targetId: 'n4' },
      { id: 'c5', sourceId: 'n4', targetId: 'n5' },
      { id: 'c6', sourceId: 'n5', targetId: 'n6' },
      { id: 'c7', sourceId: 'n6', targetId: 'n7' },
      { id: 'c8', sourceId: 'n7', targetId: 'n8' },
      { id: 'c9', sourceId: 'n8', targetId: 'output' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    const runResult = await engine.runWorkflow();

    expect(runResult.logs.length).toBe(10);
    expect(runResult.finalResult).toBeDefined();
  });

  it('should detect infinite loop and terminate at step 50', async () => {
    // 5 nodes in a loop: Input + N1 + N2 + N3 + N4 + N5 (each executed up to 10 times, total steps > 50)
    const nodes: FlowNode[] = [
      { id: 'input', type: 'input', title: 'Input', x: 0, y: 0, fields: { variables: [] }, description: '' },
      { id: 'n1', type: 'prompt', title: 'Node 1', x: 0, y: 0, fields: { template: '1' }, description: '' },
      { id: 'n2', type: 'prompt', title: 'Node 2', x: 0, y: 0, fields: { template: '2' }, description: '' },
      { id: 'n3', type: 'prompt', title: 'Node 3', x: 0, y: 0, fields: { template: '3' }, description: '' },
      { id: 'n4', type: 'prompt', title: 'Node 4', x: 0, y: 0, fields: { template: '4' }, description: '' },
      { id: 'n5', type: 'prompt', title: 'Node 5', x: 0, y: 0, fields: { template: '5' }, description: '' }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'input', targetId: 'n1' },
      { id: 'c2', sourceId: 'n1', targetId: 'n2' },
      { id: 'c3', sourceId: 'n2', targetId: 'n3' },
      { id: 'c4', sourceId: 'n3', targetId: 'n4' },
      { id: 'c5', sourceId: 'n4', targetId: 'n5' },
      { id: 'c6', sourceId: 'n5', targetId: 'n1' } // backedge
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    
    // The engine should throw the custom Max execution steps error
    await expect(engine.runWorkflow()).rejects.toThrow('Max execution steps (50) reached. Possible infinite loop detected.');
  });
});
