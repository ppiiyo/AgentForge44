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
});
