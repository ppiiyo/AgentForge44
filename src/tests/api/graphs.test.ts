import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../server.js';
import { signToken } from '../../api/userAuth.js';

describe('=== Graphs API Integration Suite ===', () => {
  const testGraphId = 'test-graph-workflow-44';
  const testGraphPayload = {
    id: testGraphId,
    name: 'test-graph-workflow-44',
    nodes: [
      { id: 'start-node', type: 'input', title: 'Start', x: 0, y: 0 }
    ],
    connections: []
  };

  const userToken = signToken({ id: 'user-a', email: 'user-a@test.com', role: 'editor' });

  it('should successfully create a new graph via POST /api/graphs', async () => {
    const res = await request(app)
      .post('/api/graphs')
      .set('Authorization', `Bearer ${userToken}`)
      .send(testGraphPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe(testGraphId);
  });

  it('should retrieve the created graph via GET /api/graphs/:id', async () => {
    const res = await request(app)
      .get(`/api/graphs/${testGraphId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testGraphId);
    expect(res.body.nodes.length).toBe(1);
  });

  it('should update the specified graph details via PUT /api/graphs/:id', async () => {
    const updatedPayload = {
      ...testGraphPayload,
      name: 'Dynamic Integration flow - Version 2',
      nodes: [
        { id: 'start-node', type: 'input', title: 'Start Updated', x: 10, y: 10 }
      ]
    };

    const res = await request(app)
      .put(`/api/graphs/${testGraphId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(updatedPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.name).toBe('Dynamic Integration flow - Version 2');
  });

  it('should delete the saved graph workspace via DELETE /api/graphs/:id', async () => {
    const res = await request(app)
      .delete(`/api/graphs/${testGraphId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm GET returns 404
    const getRes = await request(app)
      .get(`/api/graphs/${testGraphId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(getRes.status).toBe(404);
  });
});
