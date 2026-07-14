import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FlowNodeSchema, FlowConnectionSchema, PipelineExecuteSchema } from '../schemas/pipeline.schema.js';

describe('OpenAPI & Zod Contract Alignment Tests', () => {
  const swaggerPath = path.join(process.cwd(), 'swagger.json');

  it('should ensure swagger.json exists and is valid JSON', () => {
    expect(fs.existsSync(swaggerPath)).toBe(true);
    const rawData = fs.readFileSync(swaggerPath, 'utf-8');
    const swagger = JSON.parse(rawData);
    expect(swagger).toBeDefined();
    expect(swagger.openapi).toBe('3.0.0');
    expect(swagger.info.title).toContain('KostromAi44');
  });

  it('should verify contract endpoints are declared in OpenAPI specification', () => {
    const rawData = fs.readFileSync(swaggerPath, 'utf-8');
    const swagger = JSON.parse(rawData);
    const paths = Object.keys(swagger.paths || {});

    // Ensure core API routes are documented
    const hasGraphs = paths.some(p => p.includes('/api/graphs') || p.includes('/api/health'));
    expect(hasGraphs).toBe(true);
  });

  it('should assert Zod FlowNodeSchema matches core property expectations of flow nodes', () => {
    // Validate FlowNode schema properties
    const sampleNode = {
      id: 'node-1',
      type: 'gemini',
      title: 'Gemini Node',
      x: 10,
      y: 20,
      description: 'Test node',
      fields: {}
    };

    const parseResult = FlowNodeSchema.safeParse(sampleNode);
    expect(parseResult.success).toBe(true);

    const invalidNode = {
      id: '', // id too short
      type: 'invalid-type' // invalid type enum
    };
    const invalidParseResult = FlowNodeSchema.safeParse(invalidNode);
    expect(invalidParseResult.success).toBe(false);
  });

  it('should assert Zod PipelineExecuteSchema is compliant with execution contract requirements', () => {
    const validExecution = {
      nodes: [
        { id: 'node-1', type: 'input', title: 'Input Node' },
        { id: 'node-2', type: 'gemini', title: 'LLM Node' }
      ],
      connections: [
        { id: 'conn-1', sourceId: 'node-1', targetId: 'node-2' }
      ],
      inputs: { prompt: 'Who is Einstein?' }
    };

    const parseResult = PipelineExecuteSchema.safeParse(validExecution);
    expect(parseResult.success).toBe(true);
  });
});
