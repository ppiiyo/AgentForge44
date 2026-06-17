import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { StatefulExecutionEngine } from '../api/execution.js';
import { FlowNode, FlowConnection } from '../types.js';

describe('=== Phase 3: Functional Logic and Edge Cases Suite ===', () => {

  describe('1. Infinite Loop and global steps limit (max_steps)', () => {
    it('should abort cleanly when execution steps exceed the 50 steps threshold', async () => {
      // Construct a sequence of 52 nodes to guarantee totalStepsExecuted goes over 50
      const nodes: FlowNode[] = [];
      const connections: FlowConnection[] = [];

      // Add input starter node
      nodes.push({
        id: 'node-0',
        type: 'input',
        title: 'Starter Node',
        x: 0, y: 0,
        description: '',
        fields: { variables: [ { key: 'val', value: 'hello', label: 'val' } ] }
      });

      // Add 51 sequential prompt nodes (total 52 nodes)
      for (let i = 1; i <= 51; i++) {
        nodes.push({
          id: `node-${i}`,
          type: 'prompt',
          title: `Prompt Step ${i}`,
          x: i * 50, y: i * 50,
          description: '',
          fields: { template: `Step ${i}` }
        });

        connections.push({
          id: `conn-${i}`,
          sourceId: `node-${i - 1}`,
          targetId: `node-${i}`
        });
      }

      const engine = new StatefulExecutionEngine(nodes, connections);

      // Verify that executing this massive chain throws "Max execution steps reached"
      await expect(engine.runWorkflow({})).rejects.toThrow("Max execution steps reached");
    });
  });

  describe('2. Zod boundary API payload validations', () => {
    it('should reject POST /graphs with missing nodes/connections format', async () => {
      const res = await request(app)
        .post('/api/graphs')
        .send({
          id: 'invalid-structure',
          nodes: "this should be an array, not a string"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Schema validation failed");
    });

    it('should reject POST /run-pipeline with malformed node structure', async () => {
      const res = await request(app)
        .post('/api/run-pipeline')
        .send({
          nodes: [
            {
              id: '', // invalid: empty id
              type: 'unknown-type', // invalid type
              title: 12345 // invalid: title should be string
            }
          ],
          connections: []
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Schema validation failed");
    });
  });

});
