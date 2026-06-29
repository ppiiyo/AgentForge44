import { describe, it, expect, vi } from 'vitest';
import { authMiddleware, requireRole } from '../../api/authRoutes.js';
import { classifyLLMError } from '../../api/agentRun.js';

describe('Auth Middleware and LLM Classifier Suite', () => {
  describe('LLM Classifier tests', () => {
    it('should classify 401/403 and api key issues as AUTHENTICATION_ERROR', () => {
      const err1 = { status: 401, message: 'unauthorized request' };
      const res1 = classifyLLMError(err1);
      expect(res1.isTransient).toBe(false);
      expect(res1.label).toBe('AUTHENTICATION_ERROR');

      const err2 = { message: 'invalid API key provided' };
      const res2 = classifyLLMError(err2);
      expect(res2.isTransient).toBe(false);
      expect(res2.label).toBe('AUTHENTICATION_ERROR');
    });

    it('should classify 400 and bad requests as BAD_REQUEST', () => {
      const err1 = { status: 400, message: 'bad request parameters' };
      const res1 = classifyLLMError(err1);
      expect(res1.isTransient).toBe(false);
      expect(res1.label).toBe('BAD_REQUEST');
    });

    it('should classify 429 and rate limits/quota as RATE_LIMIT_EXHAUSTED', () => {
      const err1 = { status: 429, message: 'Resource exhausted or rate limits exceeded' };
      const res1 = classifyLLMError(err1);
      expect(res1.isTransient).toBe(true);
      expect(res1.label).toBe('RATE_LIMIT_EXHAUSTED');
    });

    it('should classify 500/503 and overloads as SERVICE_OVERLOAD', () => {
      const err1 = { status: 503, message: 'model provider overloaded' };
      const res1 = classifyLLMError(err1);
      expect(res1.isTransient).toBe(true);
      expect(res1.label).toBe('SERVICE_OVERLOAD');
    });

    it('should default to UNKNOWN_TRANSIENT for generic errors', () => {
      const err1 = new Error('unexpected connection abort');
      const res1 = classifyLLMError(err1);
      expect(res1.isTransient).toBe(true);
      expect(res1.label).toBe('UNKNOWN_TRANSIENT');
    });
  });

  describe('Auth Middleware tests', () => {
    it('should return 401 if Authorization header is missing', () => {
      const req = { headers: {} } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized: Authorization header is missing' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is empty', () => {
      const req = { headers: { authorization: 'Bearer ' } } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized: Auth token is empty' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should bypass and set admin if AGENTFORGE_API_KEY matches', () => {
      const req = { headers: { authorization: 'Bearer fake_secret_token' } } as any;
      const res = {} as any;
      const next = vi.fn();

      // Temporarily set key
      const oldKey = process.env.AGENTFORGE_API_KEY;
      process.env.AGENTFORGE_API_KEY = 'fake_secret_token';

      authMiddleware(req, res, next);

      expect(req.user).toEqual({ id: 'admin', email: 'admin@agentforge.ai', role: 'admin' });
      expect(next).toHaveBeenCalled();

      process.env.AGENTFORGE_API_KEY = oldKey;
    });
  });

  describe('Require Role tests', () => {
    it('should return 403 if req.user lacks permissions', () => {
      const req = { workspaceRole: 'viewer' } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      const middleware = requireRole(['admin', 'editor']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Forbidden: Insufficient privileges' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should bypass and set admin if AGENTFORGE_API_KEY matches', () => {
      const req = { headers: { authorization: 'Bearer fake_secret_token' } } as any;
      const res = {} as any;
      const next = vi.fn();

      // Temporarily set key
      const oldKey = process.env.AGENTFORGE_API_KEY;
      process.env.AGENTFORGE_API_KEY = 'fake_secret_token';

      authMiddleware(req, res, next);

      expect(req.user).toEqual({ id: 'admin', email: 'admin@agentforge.ai', role: 'admin' });
      expect(next).toHaveBeenCalled();

      // Now verify requireRole permits this admin user bypassing workspaceRole
      const middleware = requireRole(['admin', 'editor']);
      const nextRole = vi.fn();
      middleware(req, res, nextRole);
      expect(nextRole).toHaveBeenCalled();

      process.env.AGENTFORGE_API_KEY = oldKey;
    });

    it('should call next if workspaceRole is allowed', () => {
      const req = { workspaceRole: 'editor' } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any;
      const next = vi.fn();

      const middleware = requireRole(['admin', 'editor']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
