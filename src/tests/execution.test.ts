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
});
