import safeRegex from 'safe-regex';
import { Worker } from 'worker_threads';

/**
 * Validates whether a regex pattern is safe from ReDoS attacks.
 */
export function validateRegex(pattern: string): boolean {
  try {
    if (!pattern) return true;
    return safeRegex(pattern);
  } catch (err) {
    return false;
  }
}

/**
 * Executes a regex test inside a Worker thread with a strict 100ms timeout
 * to protect against CPU-blocking ReDoS attacks.
 */
export function testRegexWithTimeout(pattern: string, input: string, timeoutMs: number = 100): Promise<boolean> {
  return new Promise((resolve) => {
    if (!validateRegex(pattern)) {
      // ReDoS pattern statically blocked
      resolve(false);
      return;
    }

    const workerCode = `
      const { parentPort, workerData } = require('worker_threads');
      try {
        const { pattern, input } = workerData;
        const regex = new RegExp(pattern, 'i');
        const result = regex.test(input);
        parentPort.postMessage({ success: true, result });
      } catch (err) {
        parentPort.postMessage({ success: false, error: err.message });
      }
    `;

    const worker = new Worker(workerCode, {
      eval: true,
      workerData: { pattern, input }
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      resolve(false);
    }, timeoutMs);

    worker.on('message', (message) => {
      clearTimeout(timeout);
      worker.terminate();
      if (message.success) {
        resolve(message.result);
      } else {
        resolve(false);
      }
    });

    worker.on('error', () => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(false);
    });

    worker.on('exit', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Recursively freezes an object and throws an error if Prototype Pollution keys
 * (__proto__, constructor, prototype) are present.
 */
export function deepSanitizeAndFreeze<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'object') {
    // Prototype pollution prevention
    const keys = Object.getOwnPropertyNames(obj);
    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error(`Security Violation: Prototype Pollution detected with key "${key}"`);
      }
      
      const val = (obj as any)[key];
      if (typeof val === 'object' && val !== null) {
        deepSanitizeAndFreeze(val);
      }
    }

    Object.freeze(obj);
  }

  return obj;
}
