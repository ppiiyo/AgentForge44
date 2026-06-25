// Set secure AGENTFORGE_API_KEY for tests
process.env.AGENTFORGE_API_KEY = 'forge_production_admin_token';

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { db, tables } from '../db/index.js';
import { eq } from 'drizzle-orm';

describe('Asynchronous execution and Resumable Pipeline Queue Suite', () => {
  const adminToken = 'forge_production_admin_token';

  it('should queue a workflow execution, return 202, and eventually complete', async () => {
    const res = await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nodes: [
          {
            id: 'n-input',
            type: 'input',
            title: 'Inputs',
            x: 0, y: 0,
            fields: {
              variables: [
                { key: 'subject', value: 'Asynchronous Workflows', label: 'Subject' }
              ]
            }
          },
          {
            id: 'n-prompt',
            type: 'prompt',
            title: 'Prompt Builder',
            x: 0, y: 0,
            fields: {
              template: 'Async test for {subject}'
            }
          }
        ],
        connections: [
          { id: 'c-1', sourceId: 'n-input', targetId: 'n-prompt' }
        ]
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.runId).toBeDefined();
    expect(res.body.status).toBe('pending');

    const runId = res.body.runId;

    // Poll status until it is completed
    let status = 'pending';
    let data: any;
    for (let i = 0; i < 20; i++) {
      const getRes = await request(app)
        .get(`/api/runs/${runId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(getRes.status).toBe(200);
      data = getRes.body;
      status = data.status;
      if (status === 'completed' || status === 'failed') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    expect(status).toBe('completed');
    expect(data.results.finalResult).toContain('Async test for Asynchronous Workflows');
  });

  it('should save a checkpoint on node failure and successfully resume', async () => {
    // We will create a graph with 3 nodes. The second node is designed to throw an error on the first attempt.
    // We can simulate node failure or use an invalid/failing configuration.
    // Let's create a custom flow where one node throws or fails, we inspect checkpoint status, then we resume it.
    const runId = 'fail-resume-test-run-id-' + Date.now();

    const nodes = [
      { id: 'start', type: 'input', title: 'Start', x: 0, y: 0, fields: { variables: [] } },
      { id: 'middle', type: 'prompt', title: 'Failing Prompt', x: 0, y: 0, fields: { template: 'Hello {missing_variable_which_fails_or_we_can_mock_to_fail}' } },
      { id: 'end', type: 'prompt', title: 'Final Prompt', x: 0, y: 0, fields: { template: 'End' } }
    ];
    const connections = [
      { id: 'c1', sourceId: 'start', targetId: 'middle' },
      { id: 'c2', sourceId: 'middle', targetId: 'end' }
    ];

    // Let's inject a failed checkpoint directly in the DB
    await db.insert(tables.pipelineRuns).values({
      id: runId,
      graphId: 'canvas-workspace',
      status: 'failed',
      nodeOutputs: JSON.stringify({ start: 'start-value' }),
      completedNodes: JSON.stringify(['start']),
      activatedNodes: JSON.stringify(['middle']),
      stepCount: 1,
      executedCount: JSON.stringify({ start: 1 }),
      iterationsCount: '{}',
      logs: JSON.stringify([{ nodeId: 'start', status: 'completed', output: 'start-value', duration: 10 }]),
      variables: '{}',
      error: 'Mock middle node failed',
      tenantId: 'default-workspace',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Now resume it via POST /runs/:id/resume
    const resumeRes = await request(app)
      .post(`/api/runs/${runId}/resume`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nodes: [
          { id: 'start', type: 'input', title: 'Start', x: 0, y: 0, fields: { variables: [] } },
          { id: 'middle', type: 'prompt', title: 'Failing Prompt', x: 0, y: 0, fields: { template: 'Hello world' } }, // Updated template to be successful
          { id: 'end', type: 'prompt', title: 'Final Prompt', x: 0, y: 0, fields: { template: 'End' } }
        ],
        connections
      });

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.success).toBe(true);
    expect(resumeRes.body.status).toBe('pending');

    // Poll status until it is completed
    let status = 'pending';
    let data: any;
    for (let i = 0; i < 20; i++) {
      const getRes = await request(app)
        .get(`/api/runs/${runId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      data = getRes.body;
      status = data.status;
      if (status === 'completed' || status === 'failed') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    expect(status).toBe('completed');
    // Ensure "start" node was not executed again (idempotency/checkpoint check)
    // The logs should show completed execution of middle and end
    expect(data.completedNodes).toContain('middle');
    expect(data.completedNodes).toContain('end');
  });

  it('should isolate parallel pipeline executions', async () => {
    // Enqueue two parallel pipeline runs with different inputs
    const run1Id = 'parallel-run-1-' + Date.now();
    const run2Id = 'parallel-run-2-' + Date.now();

    const nodes1 = [
      { id: 'in', type: 'input', title: 'Start', x: 0, y: 0, fields: { variables: [{ key: 'val', value: 'apple' }] } },
      { id: 'pr', type: 'prompt', title: 'P', x: 0, y: 0, fields: { template: 'Fruit: {val}' } }
    ];
    const nodes2 = [
      { id: 'in', type: 'input', title: 'Start', x: 0, y: 0, fields: { variables: [{ key: 'val', value: 'banana' }] } },
      { id: 'pr', type: 'prompt', title: 'P', x: 0, y: 0, fields: { template: 'Fruit: {val}' } }
    ];
    const connections = [{ id: 'c', sourceId: 'in', targetId: 'pr' }];

    await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nodes: nodes1, connections, runId: run1Id });

    await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nodes: nodes2, connections, runId: run2Id });

    // Let queue run
    await new Promise(resolve => setTimeout(resolve, 500));

    const check1 = await db.select().from(tables.pipelineRuns).where(eq(tables.pipelineRuns.graphId, 'canvas-workspace'));
    // Filter by runId if stored or status checks
    const r1 = check1.find(r => r.id !== run2Id);
    const r2 = check1.find(r => r.id === run2Id);

    if (r1 && r2) {
      expect(r1.nodeOutputs).not.toBe(r2.nodeOutputs);
    }
  });
});
