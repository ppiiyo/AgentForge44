import { describe, it, expect } from 'vitest';
import { StatefulExecutionEngine } from '../../api/execution.js';
import { FlowNode, FlowConnection } from '../../types.js';

describe('Router Node Route Logic Unit Suite', () => {
  it('should route via contains condition', async () => {
    const nodes: FlowNode[] = [
      {
        id: 'input-1',
        type: 'input',
        title: 'Input',
        x: 0, y: 0,
        fields: {
          variables: [
            { key: 'input_text', val: 'Welcome to Paris, the city of light!', label: 'Text' }
          ]
        }
      },
      {
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        x: 0, y: 0,
        fields: {
          template: 'Welcome to Paris'
        }
      },
      {
        id: 'router-1',
        type: 'router',
        title: 'Router Node',
        x: 0, y: 0,
        fields: {
          conditions: [
            { type: 'contains', value: 'Paris', targetNodeId: 'target-paris' },
            { type: 'contains', value: 'London', targetNodeId: 'target-london' }
          ],
          defaultTargetNodeId: 'target-default'
        }
      },
      {
        id: 'target-paris',
        type: 'output',
        title: 'Paris Output',
        x: 0, y: 0,
        fields: { value: 'Matched Paris!' }
      },
      {
        id: 'target-london',
        type: 'output',
        title: 'London Output',
        x: 0, y: 0,
        fields: { value: 'Matched London!' }
      },
      {
        id: 'target-default',
        type: 'output',
        title: 'Default Output',
        x: 0, y: 0,
        fields: { value: 'Matched Default!' }
      }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'input-1', targetId: 'prompt-1' },
      { id: 'c2', sourceId: 'prompt-1', targetId: 'router-1' },
      { id: 'c3_paris', sourceId: 'router-1', targetId: 'target-paris' },
      { id: 'c3_london', sourceId: 'router-1', targetId: 'target-london' },
      { id: 'c3_default', sourceId: 'router-1', targetId: 'target-default' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    const result = await engine.runWorkflow();

    // Verify Paris route was taken
    const routerLog = result.logs.find(l => l.nodeId === 'router-1');
    expect(routerLog?.output).toContain('Routed to node: target-paris');
    expect(result.finalResult).toContain('Welcome to Paris');
  });

  it('should route via regex condition', async () => {
    const nodes: FlowNode[] = [
      {
        id: 'input-1',
        type: 'input',
        title: 'Input',
        x: 0, y: 0,
        fields: {
          variables: []
        }
      },
      {
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        x: 0, y: 0,
        fields: {
          template: 'My order code is AGENT-4482.'
        }
      },
      {
        id: 'router-1',
        type: 'router',
        title: 'Router Node',
        x: 0, y: 0,
        fields: {
          conditions: [
            { type: 'regex', value: 'AGENT-\\d+', targetNodeId: 'target-regex' }
          ],
          defaultTargetNodeId: 'target-default'
        }
      },
      {
        id: 'target-regex',
        type: 'output',
        title: 'Regex Match Output',
        x: 0, y: 0,
        fields: { value: 'Regex match succeeded.' }
      },
      {
        id: 'target-default',
        type: 'output',
        title: 'Default Output',
        x: 0, y: 0,
        fields: { value: 'Default matched.' }
      }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'input-1', targetId: 'prompt-1' },
      { id: 'c2', sourceId: 'prompt-1', targetId: 'router-1' },
      { id: 'c3', sourceId: 'router-1', targetId: 'target-regex' },
      { id: 'c4', sourceId: 'router-1', targetId: 'target-default' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    const result = await engine.runWorkflow();

    const routerLog = result.logs.find(l => l.nodeId === 'router-1');
    expect(routerLog?.output).toContain('Routed to node: target-regex');
    expect(result.finalResult).toContain('My order code is AGENT-4482.');
  });

  it('should route via JSON key path condition', async () => {
    const nodes: FlowNode[] = [
      {
        id: 'input-1',
        type: 'input',
        title: 'Input',
        x: 0, y: 0,
        fields: {
          variables: []
        }
      },
      {
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        x: 0, y: 0,
        fields: {
          template: '{"user": {"verified": true, "profile": {"role": "admin"}}}'
        }
      },
      {
        id: 'router-1',
        type: 'router',
        title: 'Router Node',
        x: 0, y: 0,
        fields: {
          conditions: [
            { type: 'json_key', value: 'user.profile.role', targetNodeId: 'target-role' }
          ],
          defaultTargetNodeId: 'target-default'
        }
      },
      {
        id: 'target-role',
        type: 'output',
        title: 'Role Found Output',
        x: 0, y: 0,
        fields: { value: 'Found User Role!' }
      },
      {
        id: 'target-default',
        type: 'output',
        title: 'Default Output',
        x: 0, y: 0,
        fields: { value: 'Default matched.' }
      }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'input-1', targetId: 'prompt-1' },
      { id: 'c2', sourceId: 'prompt-1', targetId: 'router-1' },
      { id: 'c3', sourceId: 'router-1', targetId: 'target-role' },
      { id: 'c4', sourceId: 'router-1', targetId: 'target-default' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    const result = await engine.runWorkflow();

    const routerLog = result.logs.find(l => l.nodeId === 'router-1');
    expect(routerLog?.output).toContain('Routed to node: target-role');
    expect(result.finalResult).toContain('admin');
  });

  it('should fall back to default target when no conditions match', async () => {
    const nodes: FlowNode[] = [
      {
        id: 'input-1',
        type: 'input',
        title: 'Input',
        x: 0, y: 0,
        fields: {
          variables: []
        }
      },
      {
        id: 'prompt-1',
        type: 'prompt',
        title: 'Prompt',
        x: 0, y: 0,
        fields: {
          template: 'Just plain unmatching words.'
        }
      },
      {
        id: 'router-1',
        type: 'router',
        title: 'Router Node',
        x: 0, y: 0,
        fields: {
          conditions: [
            { type: 'contains', value: 'missing-word', targetNodeId: 'target-word' }
          ],
          defaultTargetNodeId: 'target-default'
        }
      },
      {
        id: 'target-word',
        type: 'output',
        title: 'Word Match Output',
        x: 0, y: 0,
        fields: { value: 'Matched word!' }
      },
      {
        id: 'target-default',
        type: 'output',
        title: 'Default Output',
        x: 0, y: 0,
        fields: { value: 'Matched Default!' }
      }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'input-1', targetId: 'prompt-1' },
      { id: 'c2', sourceId: 'prompt-1', targetId: 'router-1' },
      { id: 'c3', sourceId: 'router-1', targetId: 'target-word' },
      { id: 'c4', sourceId: 'router-1', targetId: 'target-default' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    const result = await engine.runWorkflow();

    const routerLog = result.logs.find(l => l.nodeId === 'router-1');
    expect(routerLog?.output).toContain('Routed to node: target-default');
    expect(result.finalResult).toContain('Just plain unmatching words.');
  });
});
