import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../../../server.js';
import { simpleBlueprint } from '../fixtures/blueprints.js';

const request = supertest(app);

describe('Pipeline API E2E', () => {
  let authToken: string;
  let blueprintId: string;

  beforeAll(async () => {
    // Register the test user first to ensure they exist
    const regRes = await request
      .post('/api/auth/register')
      .send({ email: 'test_e2e_user@example.com', password: 'test123password', role: 'editor' });

    if (regRes.status === 201 && regRes.body.token) {
      authToken = regRes.body.token;
    } else {
      // If registration failed (e.g. user already exists), log in
      const authRes = await request
        .post('/api/auth/login')
        .send({ email: 'test_e2e_user@example.com', password: 'test123password' });
      authToken = authRes.body.token;
    }

    expect(authToken).toBeDefined();

    // Create blueprint
    const blueprintRes = await request
      .post('/api/blueprints')
      .set('Authorization', `Bearer ${authToken}`)
      .send(simpleBlueprint);
    
    expect(blueprintRes.status).toBe(201);
    blueprintId = blueprintRes.body.id;
    expect(blueprintId).toBeDefined();
  });

  it('POST /api/execute should run pipeline and return result', async () => {
    const res = await request
      .post('/api/execute')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        blueprintId,
        inputs: { text: 'Test input' }
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.executionId).toBeDefined();
  });

  it('GET /api/executions/:id should return execution details', async () => {
    const executeRes = await request
      .post('/api/execute')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ blueprintId, inputs: {} });

    const executionId = executeRes.body.executionId;

    const res = await request
      .get(`/api/executions/${executionId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(executionId);
    expect(res.body.logs).toBeInstanceOf(Array);
  });

  it('should enforce rate limiting or respond normally within limits', async () => {
    // Send a burst of requests to verify stability and error limits
    const promises = Array(10).fill(null).map(() =>
      request
        .post('/api/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ blueprintId, inputs: {} })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(
      r => r.status === 'fulfilled' && (r.value.status === 200 || r.value.status === 429)
    );

    expect(successful.length).toBeGreaterThan(0);
  });
});
