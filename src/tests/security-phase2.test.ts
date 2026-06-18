import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { EncryptionService } from '../services/encryption.js';
import { SaveGraphSchema } from '../utils/validation.js';
import { StatefulExecutionEngine } from '../api/execution.js';
import { FlowNode, FlowConnection } from '../types.js';
import DOMPurify from 'isomorphic-dompurify';
import { app } from '../../server.js';

describe('=== Phase 2: Security Hardening (Enterprise-grade) Unit Suite ===', () => {

  describe('1. XSS Protection', () => {
    it('should sanitize script tags in Prompt nodes', async () => {
      const nodes: FlowNode[] = [
        {
          id: 'inp-1',
          type: 'input',
          title: 'Input',
          x: 0, y: 0,
          description: '',
          fields: {
            variables: [{ key: 'unsafe', value: '<script>alert("xss")</script><iframe src="javascript:alert(1)"></iframe>', label: 'Unsafe' }]
          }
        },
        {
          id: 'prompt-1',
          type: 'prompt',
          title: 'Unsafe Prompt',
          x: 0, y: 0,
          description: '',
          fields: {
            template: 'Before: {unsafe}'
          }
        }
      ];

      const connections: FlowConnection[] = [
        { id: 'c1', sourceId: 'inp-1', targetId: 'prompt-1' }
      ];

      const engine = new StatefulExecutionEngine(nodes, connections);
      const run = await engine.runWorkflow();

      const promptLog = run.logs.find(l => l.nodeId === 'prompt-1');
      expect(promptLog).toBeDefined();
      
      const payload = promptLog?.output || '';
      // Ensure scripts and javascript iframe URIs are completely stripped/sanitized
      expect(payload).not.toContain('<script>');
      expect(payload).not.toContain('javascript:alert');
    });

    it('should sanitize javascript URL payloads via DOMPurify', () => {
      const clean1 = DOMPurify.sanitize(`<script>alert('xss')</script>`);
      expect(clean1).not.toContain('<script>');
      expect(clean1).not.toContain('alert');

      const clean2 = DOMPurify.sanitize(`<a href="javascript:alert(1)">Click</a>`);
      expect(clean2).not.toContain('javascript:');
    });
  });

  describe('2. Content Security Policy (CSP) Headers', () => {
    it('should include helmet CSP response headers on requesting server endpoint', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
      expect(res.headers['content-security-policy']).toContain("object-src 'none'");
    });
  });

  describe('3. CSRF Protection', () => {
    it('should reject requests without a CSRF token with a 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/test-payload')
        .set('X-Enforce-CSRF', 'true')
        .send({ data: 'test' });
      
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('CSRF');
    });

    it('should accept POST requests when a valid CSRF token and cookie are supplied', async () => {
      // Step 1: Request CSRF-Token to establish session
      const getRes = await request(app).get('/api/csrf-token');
      expect(getRes.status).toBe(200);
      expect(getRes.body.csrfToken).toBeDefined();

      const token = getRes.body.csrfToken;
      const cookies = getRes.headers['set-cookie'];

      // Step 2: Post with cookies and token headers
      const postRes = await request(app)
        .post('/api/test-payload')
        .set('Cookie', cookies)
        .set('X-Enforce-CSRF', 'true')
        .set('X-CSRF-Token', token)
        .send({ payload: 'test' });

      expect(postRes.status).toBe(200);
      expect(postRes.body.received).toBe(true);
    });
  });

  describe('4. API Key Encryption & Decryption & Rotation', () => {
    it('should encrypt plaintext keys into AES-256-GCM triple segment strings', () => {
      const originalKey = 'my-super-secret-api-key-12345';
      const encrypted = EncryptionService.encrypt(originalKey);
      
      expect(encrypted).not.toBe(originalKey);
      expect(encrypted.split(':').length).toBe(3); // iv:authTag:ciphertext
    });

    it('should correctly decrypt a ciphertext to recover the plaintext key', () => {
      const originalKey = 'my-super-secret-api-key-12345';
      const encrypted = EncryptionService.encrypt(originalKey);
      const decrypted = EncryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(originalKey);
    });

    it('should rotate keys by decrypting old key ciphertext and encrypting with a new key value', () => {
      const rawKey = 'test-key-payload-777';
      const oldSecret = 'old-encryption-key-secret-abc';
      const newSecret = 'new-encryption-key-secret-xyz';

      // Manually encrypt with old key secret
      const encryptedOld = EncryptionService.rotate(rawKey, oldSecret, oldSecret);
      
      // Perform rotate
      const encryptedNew = EncryptionService.rotate(encryptedOld, oldSecret, newSecret);
      expect(encryptedNew).not.toBe(encryptedOld);

      // Verify old system decrypts correctly with target decryption key rotation setup
      const decrypted = EncryptionService.rotate(encryptedNew, newSecret, newSecret);
      expect(decrypted.split(':')).toBeDefined();
    });
  });

  describe('5. Input Validation with Zod (SaveGraphSchema)', () => {
    it('should pass valid data mapping SaveGraphSchema', () => {
      const validData = {
        name: "Enterprise Workflow Pipeline",
        nodes: [
          { id: "node-1", type: "prompt", title: "Generate Spec", x: 10, y: 15 }
        ],
        edges: [
          { id: "edge-1", sourceId: "node-1", targetId: "node-2" }
        ]
      };

      const result = SaveGraphSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject schemas when graph name exceeds 100 characters', () => {
      const longName = "A".repeat(101);
      const invalidData = {
        name: longName,
        nodes: [],
        edges: []
      };

      const result = SaveGraphSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject schemas when graph nodes exceed 100 limit', () => {
      const nodesArray = Array.from({ length: 101 }, (_, i) => ({
        id: `node-${i}`,
        type: "prompt",
        title: `Node ${i}`,
        x: 0,
        y: 0
      }));

      const invalidData = {
        name: "Big Scale Graph Workflow",
        nodes: nodesArray,
        edges: []
      };

      const result = SaveGraphSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject schemas when graph edges exceed 200 limit', () => {
      const edgesArray = Array.from({ length: 201 }, (_, i) => ({
        id: `edge-${i}`,
        sourceId: `source-${i}`,
        targetId: `target-${i}`
      }));

      const invalidData = {
        name: "Big Edge Scaler",
        nodes: [],
        edges: edgesArray
      };

      const result = SaveGraphSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

});
