import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../server.js';
import { signToken } from '../../api/userAuth.js';

describe('Marketplace API Integration Suite', () => {
  let createdItemId = '';
  const userToken = signToken({ id: 'user-a', email: 'user-a@test.com', role: 'editor' });

  it('should successfully list active marketplace templates via GET /api/marketplace', async () => {
    const res = await request(app)
      .get('/api/marketplace');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should fetch featured marketplace templates via GET /api/marketplace/featured', async () => {
    const res = await request(app)
      .get('/api/marketplace/featured');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.length).toBeLessThanOrEqual(3);
  });

  it('should filter marketplace templates by category via GET /api/marketplace?category=agent', async () => {
    const res = await request(app)
      .get('/api/marketplace?category=agent');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((item: any) => item.category === 'agent')).toBe(true);
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
      .set('Authorization', `Bearer ${userToken}`)
      .send(publishPayload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('DevOps Multi-Agent Scanner');
    expect(res.body.downloadsCount).toBe(0);

    createdItemId = res.body.id;
  });

  it('should return error if publishing with invalid/missing nodes inside graph snapshot', async () => {
    const invalidPayload = {
      title: 'Faulty Scanner',
      description: 'Corrupt snapshot demo',
      category: 'template',
      tags: [],
      graphSnapshot: {}
    };

    const res = await request(app)
      .post('/api/marketplace')
      .set('Authorization', `Bearer ${userToken}`)
      .send(invalidPayload);

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  it('should retrieve custom item details and unified reviews by ID via GET /api/marketplace/:id', async () => {
    expect(createdItemId).toBeDefined();

    const res = await request(app)
      .get(`/api/marketplace/${createdItemId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('item');
    expect(res.body).toHaveProperty('reviews');
    expect(res.body.item.id).toBe(createdItemId);
    expect(res.body.item.title).toBe('DevOps Multi-Agent Scanner');
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it('should return 404 for nonexistent marketplace item IDs', async () => {
    const res = await request(app)
      .get('/api/marketplace/mkt-nonexistent-12345');

    expect(res.status).toBe(404);
  });

  it('should increment download count and yield graphSnapshot details via POST /api/marketplace/:id/download', async () => {
    expect(createdItemId).toBeDefined();

    const res = await request(app)
      .post(`/api/marketplace/${createdItemId}/download`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.downloadsCount).toBe(1);
    expect(res.body.graphSnapshot.nodes.length).toBe(1);
  });

  it('should add a review to the marketplace item via POST /api/marketplace/:id/reviews', async () => {
    const reviewPayload = {
      userId: 'expert_reviewer_1',
      rating: 4.5,
      comment: 'Excellent sandbox compliance and clean structure!'
    };

    const res = await request(app)
      .post(`/api/marketplace/${createdItemId}/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(reviewPayload);

    expect(res.status).toBe(200);
    expect(res.body.itemId).toBe(createdItemId);
    expect(res.body.rating).toBe(4.5);
    expect(res.body.comment).toBe('Excellent sandbox compliance and clean structure!');
  });

  it('should reject invalid reviews if rating is missing or comment is invalid', async () => {
    const invalidReview = {
      comment: ''
    };

    const res = await request(app)
      .post(`/api/marketplace/${createdItemId}/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(invalidReview);

    expect(res.status).toBe(400);
  });

  it('should now contain our newly added review inside subsequent unified item fetches', async () => {
    const res = await request(app)
      .get(`/api/marketplace/${createdItemId}`);

    expect(res.status).toBe(200);
    expect(res.body.reviews.length).toBeGreaterThan(0);
    expect(res.body.reviews[0].comment).toContain('Excellent sandbox compliance');
  });
});
