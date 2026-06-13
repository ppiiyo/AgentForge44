import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StatefulExecutionEngine } from '../../api/execution.js';
import { FlowNode, FlowConnection } from '../../types.js';

describe('Tool Node Unit Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should execute HTTP GET query successfully', async () => {
    const mockJson = { message: "Successfully fetched" };
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify(mockJson)
    });

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
        id: 'tool-1',
        type: 'tool',
        title: 'Fetch Weather Info',
        x: 0, y: 0,
        fields: {
          url: 'https://api.weather.com/v1/forecast',
          method: 'GET',
          headers: '{"Accept": "application/json"}',
          body: ''
        }
      }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'input-1', targetId: 'tool-1' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    const result = await engine.runWorkflow();

    expect(global.fetch).toHaveBeenCalledWith('https://api.weather.com/v1/forecast', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    expect(result.finalResult).toContain("Successfully fetched");
    const log = result.logs.find(l => l.nodeId === 'tool-1');
    expect(log?.status).toBe('completed');
  });

  it('should execute HTTP POST query with substituted body and variables', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 201,
      text: async () => "User Created Successfully"
    });

    const nodes: FlowNode[] = [
      {
        id: 'input-1',
        type: 'input',
        title: 'Input Node',
        x: 0, y: 0,
        fields: {
          variables: [
            { key: 'username', value: 'alice44', label: 'username' }
          ]
        }
      },
      {
        id: 'tool-1',
        type: 'tool',
        title: 'Create User Tool',
        x: 0, y: 0,
        fields: {
          url: 'https://api.example.com/users',
          method: 'POST',
          headers: '{"X-Header": "StaticHeader-{username}"}',
          body: '{"name": "{username}"}'
        }
      }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'input-1', targetId: 'tool-1' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);
    const result = await engine.runWorkflow();

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Header': 'StaticHeader-alice44'
      },
      body: '{"name": "alice44"}'
    });

    expect(result.finalResult).toBe("User Created Successfully");
  });

  it('should gracefully bubble errors when fetch throws exception', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network offline'));

    const nodes: FlowNode[] = [
      {
        id: 'input-1',
        type: 'input',
        title: 'Input',
        x: 0, y: 0,
        fields: {}
      },
      {
        id: 'tool-1',
        type: 'tool',
        title: 'Failing Tool',
        x: 0, y: 0,
        fields: {
          url: 'https://api.broken.endpoint',
          method: 'GET'
        }
      }
    ];

    const connections: FlowConnection[] = [
      { id: 'c1', sourceId: 'input-1', targetId: 'tool-1' }
    ];

    const engine = new StatefulExecutionEngine(nodes, connections);

    await expect(engine.runWorkflow()).rejects.toThrow('HTTP Tool node failed: Network offline');
  });
});
