import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { maskSecrets } from '../utils/logger.js';

// Set secure AGENTFORGE_API_KEY for tests
process.env.AGENTFORGE_API_KEY = 'forge_production_admin_token';

import { app } from '../../server.js';

describe('Server API Integration Suite', () => {
  it('should return health check state', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('should return 401 when running a workflow without credentials', async () => {
    const res = await request(app)
      .post('/api/runs')
      .send({
        nodes: [],
        connections: []
      });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('should execute simple workflow when authorized with default bearer token', async () => {
    const response = await request(app)
      .post('/api/runs')
      .set('Authorization', 'Bearer forge_production_admin_token')
      .send({
        nodes: [
          {
            id: 'step-input',
            type: 'input',
            title: 'Query Inputs',
            x: 0, y: 0,
            description: 'Inputs variables',
            fields: {
              variables: [
                { key: 'subject', value: 'Express Web API Integ', label: 'Subject' }
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
              template: 'Welcome to {subject}!'
            }
          }
        ],
        connections: [
          { id: 'conn-1', sourceId: 'step-input', targetId: 'step-prompt' }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.results.finalResult).toContain('Welcome to Express Web API Integ!');
  });

  describe('Secret Masking & Sanitization Unit Tests', () => {
    it('should recursively mask secret fields like password and api_key', () => {
      const input = {
        name: 'AgentForge',
        nested: {
          api_key: 'super-sensitive-token',
          password: 'plain_password_123',
          normalField: 'allgood'
        },
        token: 'auth-bearer-token',
        other: 'public'
      };

      const result = maskSecrets(input);
      expect(result.name).toBe('AgentForge');
      expect(result.nested.api_key).toBe('***MASKED***');
      expect(result.nested.password).toBe('***MASKED***');
      expect(result.nested.normalField).toBe('allgood');
      expect(result.token).toBe('***MASKED***');
      expect(result.other).toBe('public');
    });

    it('should sanitize request body in Express routing', async () => {
      const response = await request(app)
        .post('/api/runs')
        .set('Authorization', 'Bearer forge_production_admin_token')
        .send({
          // Omit nodes or connections to trigger exactly a 400 Bad Request
          secret_key_field: 'sensitive_payload'
        });
      expect(response.status).toBe(400);
    });
  });

  describe('Express Payload Limit Sub-suite', () => {
    it('should successfully handle a JSON payload of 5MB', async () => {
      const largeString = 'a'.repeat(5 * 1024 * 1024); // 5MB of characters
      const response = await request(app)
        .post('/api/test-payload')
        .send({ data: largeString });
      
      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      expect(response.body.size).toBeGreaterThanOrEqual(5 * 1024 * 1024);
    });

    it('should reject a JSON payload of 15MB with a 413 (Payload Too Large) error', async () => {
      const hugeString = 'b'.repeat(15 * 1024 * 1024); // 15MB of characters
      const response = await request(app)
        .post('/api/test-payload')
        .send({ data: hugeString });
      
      expect(response.status).toBe(413);
    });

    it('should successfully handle a base64-encoded payload of 8MB', async () => {
      // 8MB base64 string
      const base64String = 'c'.repeat(8 * 1024 * 1024);
      const response = await request(app)
        .post('/api/test-payload')
        .send({ base64: base64String });
      
      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
      expect(response.body.size).toBeGreaterThanOrEqual(8 * 1024 * 1024);
    });
  });

  describe('Infinite Loop Express Integration', () => {
    it('should gracefully return 500 and not crash when an infinite loop is executed', async () => {
      const response = await request(app)
        .post('/api/runs')
        .set('Authorization', 'Bearer forge_production_admin_token')
        .send({
          nodes: [
            { id: 'input', type: 'input', title: 'Input', x: 0, y: 0, fields: { variables: [] }, description: '' },
            { id: 'n1', type: 'prompt', title: 'Node 1', x: 0, y: 0, fields: { template: '1' }, description: '' },
            { id: 'n2', type: 'prompt', title: 'Node 2', x: 0, y: 0, fields: { template: '2' }, description: '' },
            { id: 'n3', type: 'prompt', title: 'Node 3', x: 0, y: 0, fields: { template: '3' }, description: '' },
            { id: 'n4', type: 'prompt', title: 'Node 4', x: 0, y: 0, fields: { template: '4' }, description: '' },
            { id: 'n5', type: 'prompt', title: 'Node 5', x: 0, y: 0, fields: { template: '5' }, description: '' }
          ],
          connections: [
            { id: 'c1', sourceId: 'input', targetId: 'n1' },
            { id: 'c2', sourceId: 'n1', targetId: 'n2' },
            { id: 'c3', sourceId: 'n2', targetId: 'n3' },
            { id: 'c4', sourceId: 'n3', targetId: 'n4' },
            { id: 'c5', sourceId: 'n4', targetId: 'n5' },
            { id: 'c6', sourceId: 'n5', targetId: 'n1' }
          ]
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Max execution steps (50) reached. Possible infinite loop detected.');
    });
  });
});
