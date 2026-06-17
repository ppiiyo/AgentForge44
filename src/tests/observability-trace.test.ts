import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { generateExecutionId } from '../utils/uuid.js';
import { StatefulExecutionEngine } from '../api/execution.js';
import { FlowNode, FlowConnection } from '../types.js';
import { logger } from '../utils/logger.js';
import { MetricsCollector } from '../api/metricsAndVersions.js';

describe('Execution Trace ID & Observability Suite', () => {
  const sampleNodes: FlowNode[] = [
    {
      id: 'step-input',
      type: 'input',
      title: 'Query Inputs',
      x: 0, y: 0,
      description: 'Inputs variables',
      fields: {
        variables: [
          { key: 'subject', value: 'Test Trace UUID', label: 'Subject' }
        ]
      }
    },
    {
      id: 'step-prompt',
      type: 'prompt',
      title: 'Compile Prompt',
      x: 0, y: 0,
      description: 'Hydrates template',
      fields: {
        template: 'Test trace ID system'
      }
    },
    {
      id: 'step-output',
      type: 'output',
      title: 'Output Result',
      x: 0, y: 0,
      description: 'Exposes output',
      fields: {
        format: 'text',
        value: ''
      }
    }
  ];

  const sampleConnections: FlowConnection[] = [
    { id: 'c1', sourceId: 'step-input', targetId: 'step-prompt' },
    { id: 'c2', sourceId: 'step-prompt', targetId: 'step-output' }
  ];

  it('should generate 10 unique UUIDs on 10 runs of generateExecutionId', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ids.add(generateExecutionId());
    }
    expect(ids.size).toBe(10);
  });

  it('should automatically attach unique execution_id to Winston logs during workflow execution', async () => {
    const infoSpy = vi.spyOn(logger, 'info');
    const engine = new StatefulExecutionEngine(sampleNodes, sampleConnections);
    
    const runResult = await engine.runWorkflow({}, 'test-graph', 'Test Graph Name');
    expect(runResult.executionId).toBeDefined();
    expect(typeof runResult.executionId).toBe('string');
    expect(runResult.executionId?.length).toBeGreaterThan(0);

    // Verify spy caught logged parameters containing matching execution_id
    expect(infoSpy).toHaveBeenCalled();
    const matchesId = infoSpy.mock.calls.some((callArgs) => {
      const logObj = callArgs[0];
      return typeof logObj === 'object' && logObj !== null && logObj.execution_id === runResult.executionId;
    });

    expect(matchesId).toBe(true);
    infoSpy.mockRestore();
  });

  it('should correctly save workflow execution details in database with the matched execution_id', async () => {
    const engine = new StatefulExecutionEngine(sampleNodes, sampleConnections);
    const runResult = await engine.runWorkflow({}, 'metrics-test-graph', 'Metrics Test Graph');

    const executions = MetricsCollector.getExecutionsByGraph('metrics-test-graph');
    expect(executions.length).toBeGreaterThan(0);

    const savedLog = executions.find(e => e.id === runResult.executionId);
    expect(savedLog).toBeDefined();
    expect(savedLog?.graphId).toBe('metrics-test-graph');
    expect(savedLog?.graphName).toBe('Metrics Test Graph');
    expect(savedLog?.status).toBe('success');
  });
});
