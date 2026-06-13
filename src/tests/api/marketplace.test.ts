import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../server.js';

describe('Marketplace API Integration Suite', () => {
  let createdItemId = '';

  it('should successfully list the active marketplace templates via GET /api/marketplace', async () => {
    const res = await request(app)
      .get('/api/marketplace');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('graphSnapshot');
  });

  it('should successfully publish a custom workflow template via POST /api/marketplace', async () => {
    const publishPayload = {
      title: 'DevOps Multi-Agent Scanner',
      description: 'Automatically analyzes dockerfiles and typescript compilation rules to secure containers.',
      category: 'template',
      tags: ['devops', 'docker', 'scanner'],
      graphSnapshot: {
        name: 'DevOps Multi-Agent Scanner',
        nodes: [
          { id: 'devops-inp', type: 'input', title: 'Scope', x: 0, y: 0 }
        ],
        connections: []
      },
      authorId: 'dev_analyst_agent'
    };

    const res = await request(app)
      .post('/api/marketplace')
      .send(publishPayload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('DevOps Multi-Agent Scanner');
    expect(res.body.downloadsCount).toBe(0);

    createdItemId = res.body.id;
  });

  it('should increment download count and yield graphSnapshot details via POST /api/marketplace/:id/download', async () => {
    expect(createdItemId).toBeDefined();

    const res = await request(app)
      .post(`/api/marketplace/${createdItemId}/download`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.downloadsCount).toBe(1);
    expect(res.body.graphSnapshot.nodes.length).toBe(1);
  });
});
