process.env.AGENTFORGE_API_KEY = 'forge_production_admin_token';

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { db, tables } from '../db/index.js';
import { eq } from 'drizzle-orm';

describe('Interactive Human-in-the-Loop Interventions & Live Chat Gate Suite', () => {
  const adminToken = 'forge_production_admin_token';

  it('should pause at human confirmation node, allow chat intervention, and resume on approval', async () => {
    const runId = 'human-gate-test-' + Date.now();

    const nodes = [
      {
        id: 'n-start',
        type: 'input',
        title: 'Start Inputs',
        x: 0, y: 0,
        fields: {
          variables: [
            { key: 'topic', value: 'Interactive Gates', label: 'Topic' }
          ]
        }
      },
      {
        id: 'n-gate',
        type: 'human_confirmation',
        title: 'Approve Pipeline Step',
        x: 100, y: 0,
        fields: {
          message: 'Review safety and select action option.',
          approvedValue: 'Injected gate approval'
        }
      },
      {
        id: 'n-final',
        type: 'prompt',
        title: 'Final Prompt',
        x: 200, y: 0,
        fields: {
          template: 'Pipeline completed with input: {topic} and gate: {lastOutput}'
        }
      }
    ];

    const connections = [
      { id: 'c1', sourceId: 'n-start', targetId: 'n-gate' },
      { id: 'c2', sourceId: 'n-gate', targetId: 'n-final' }
    ];

    // Trigger execution
    const res = await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nodes,
        connections,
        inputs: { topic: 'Interactive Gates' },
        graphId: 'canvas-workspace'
      });

    expect(res.status).toBe(202);
    const actualRunId = res.body.runId;

    // Poll until run pauses
    let status = 'pending';
    let data: any;
    for (let i = 0; i < 20; i++) {
      const getRes = await request(app)
        .get(`/api/runs/${actualRunId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      data = getRes.body;
      status = data.status;
      if (status === 'paused' || status === 'completed' || status === 'failed') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Verify it paused successfully at the human gate node!
    expect(status).toBe('paused');
    expect(data.completedNodes).toContain('n-start');
    expect(data.completedNodes).not.toContain('n-gate');

    // Test the dynamic chat intervention endpoint
    const chatRes = await request(app)
      .post(`/api/runs/${actualRunId}/chat`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'Why is the pipeline currently paused and what parameters does it expect?',
        nodes
      });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.success).toBe(true);
    expect(chatRes.body.reply).toBeDefined();

    // Confirm/Approve the run with user edited value
    const confirmRes = await request(app)
      .post(`/api/runs/${actualRunId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nodes,
        connections,
        nodeId: 'n-gate',
        approved: true,
        editValue: 'Custom user approved override string'
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.status).toBe('pending');

    // Poll until run finishes successfully
    for (let i = 0; i < 20; i++) {
      const getRes = await request(app)
        .get(`/api/runs/${actualRunId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      data = getRes.body;
      status = data.status;
      if (status === 'completed' || status === 'failed') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    expect(status).toBe('completed');
    expect(data.completedNodes).toContain('n-gate');
    expect(data.completedNodes).toContain('n-final');
    expect(data.nodeOutputs['n-gate']).toBe('Custom user approved override string');
  });

  it('should abort execution and mark failed if operator rejects confirmation', async () => {
    const runId = 'human-gate-reject-' + Date.now();

    const nodes = [
      { id: 'start', type: 'input', title: 'Start', x: 0, y: 0 },
      { id: 'gate', type: 'human_confirmation', title: 'Gate', x: 100, y: 0, fields: { message: 'Gate Message' } }
    ];
    const connections = [
      { id: 'c1', sourceId: 'start', targetId: 'gate' }
    ];

    const res = await request(app)
      .post('/api/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nodes, connections });

    const actualRunId = res.body.runId;

    // Poll until run pauses
    let status = 'pending';
    for (let i = 0; i < 20; i++) {
      const getRes = await request(app).get(`/api/runs/${actualRunId}`).set('Authorization', `Bearer ${adminToken}`);
      status = getRes.body.status;
      if (status === 'paused') break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    expect(status).toBe('paused');

    // Reject/Deny approval
    const confirmRes = await request(app)
      .post(`/api/runs/${actualRunId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nodes,
        connections,
        nodeId: 'gate',
        approved: false,
        feedback: 'Operator denied: parameters violate safety boundary'
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.status).toBe('failed');

    const checkRes = await request(app).get(`/api/runs/${actualRunId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(checkRes.body.status).toBe('failed');
    expect(checkRes.body.error).toBe('Operator denied: parameters violate safety boundary');
  });
});
