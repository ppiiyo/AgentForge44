import { describe, it, expect } from 'vitest';
import { executeCodeInSandbox } from '../nodes/CodeNode.js';
import { IsolatedVmSandbox } from '../services/sandbox/IsolatedVmSandbox.js';

describe('Sandbox Isolation and Security Safeguards', () => {
  it('should block attempts to use require to access system modules (e.g. child_process)', async () => {
    const code = `
      const cp = require('child_process');
      cp.execSync('id');
    `;
    const res = await executeCodeInSandbox(code);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error).toContain('is not allowed in this sandbox');
  });

  it('should allow whitelisted modules (e.g. path) inside the sandbox', async () => {
    const code = `
      const path = require('path');
      path.join('foo', 'bar');
    `;
    const res = await IsolatedVmSandbox.execute(code);
    expect(res.success).toBe(true);
    expect(res.result).toBe('foo/bar');
  });

  it('should block non-whitelisted modules (e.g. fs) inside the sandbox', async () => {
    const code = `
      const fs = require('fs');
    `;
    const res = await IsolatedVmSandbox.execute(code);
    expect(res.success).toBe(false);
    expect(res.error).toContain('is not allowed in this sandbox');
  });

  it('should not allow access to process, global, or fs', async () => {
    const code = `
      const p = typeof process !== 'undefined' ? process : undefined;
      const f = typeof fs !== 'undefined' ? fs : undefined;
      console.log('Process exists:', !!p);
      console.log('Fs exists:', !!f);
      if (p) {
        p.exit(1);
      }
    `;
    const res = await executeCodeInSandbox(code);
    expect(res.success).toBe(true);
    expect(res.logs).toContain('Process exists: false');
    expect(res.logs).toContain('Fs exists: false');
  });

  it('should terminate execution on infinite loops using isolated-vm timeout mechanism', async () => {
    const code = `
      while(true) {}
    `;
    // Set a very small timeout for the test to keep it fast
    const res = await IsolatedVmSandbox.execute(code, 200, 32);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Script execution timed out');
  });

  it('should crash isolate when code exceeds memory limits while keeping host process alive', async () => {
    const code = `
      const arr = [];
      while(true) {
        arr.push(new Array(1000000).fill('OOM'));
      }
    `;
    // Run with small 16MB limit
    const res = await IsolatedVmSandbox.execute(code, 5000, 16);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Isolate was disposed');
  });

  it('should successfully execute valid code, returning result and capturing logs', async () => {
    const code = `
      console.log('Starting calculation');
      const sum = [1, 2, 3, 4, 5].reduce((a, b) => a + b, 0);
      console.log('Sum computed:', sum);
      sum;
    `;
    const res = await executeCodeInSandbox(code);
    expect(res.success).toBe(true);
    expect(res.result).toBe(15);
    expect(res.logs).toContain('Starting calculation');
    expect(res.logs).toContain('Sum computed: 15');
  });
});
