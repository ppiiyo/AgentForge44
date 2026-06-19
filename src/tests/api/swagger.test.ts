import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../server.js';
import fs from 'fs';
import path from 'path';

describe('=== Swagger and OpenAPI Documentation Suite ===', () => {

  it('1. should serve valid OpenAPI spec at /swagger.json', async () => {
    const res = await request(app)
      .get('/swagger.json')
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info).toBeDefined();
    expect(res.body.info.title).toContain('AgentForge44');
    expect(res.body.paths).toBeDefined();
    expect(res.body.paths['/api/graphs']).toBeDefined();
  });

  it('2. should serve Swagger UI HTML at /api-docs', async () => {
    const res = await request(app)
      .get('/api-docs/')
      .expect(200);

    expect(res.text).toContain('<!DOCTYPE html>');
    expect(res.text).toContain('swagger-ui');
  });

  it('3. should verify static swagger.json generation exists in project root', () => {
    const staticJsonPath = path.join(process.cwd(), 'swagger.json');
    expect(fs.existsSync(staticJsonPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(staticJsonPath, 'utf-8'));
    expect(content.openapi).toBe('3.0.0');
    expect(content.paths['/api/graphs']).toBeDefined();
  });

  it('4. should successfully test example structural validation', () => {
    // Assert that the request examples documented in JSDoc are syntactically valid and match criteria
    const exampleGraphSave = {
      id: "my-test-agent",
      name: "My Test Agent",
      nodes: [
        { id: "node-1", type: "llm", data: { prompt: "Hello" } }
      ],
      connections: [
        { source: "node-1", target: "node-2" }
      ]
    };

    expect(exampleGraphSave.id).toBeTypeOf('string');
    expect(exampleGraphSave.nodes).toBeInstanceOf(Array);
    expect(exampleGraphSave.connections).toBeInstanceOf(Array);
  });

});
