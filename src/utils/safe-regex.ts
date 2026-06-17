import safeRegex from 'safe-regex';

/**
 * Validates whether a regex pattern is safe from ReDoS attacks.
 */
export function validateRegex(pattern: string): boolean {
  try {
    if (!pattern) return true;
    return safeRegex(pattern);
  } catch {
    return false;
  }
}

/**
 * Executes a regex test with a robust static ReDoS safety check.
 * If the pattern is safe, evaluated directly. Otherwise, statically blocked.
 */
export function testRegexWithTimeout(pattern: string, input: string, _timeoutMs: number = 100): Promise<boolean> {
  return new Promise((resolve) => {
    if (!validateRegex(pattern)) {
      // ReDoS pattern statically blocked
      resolve(false);
      return;
    }

    try {
      const regex = new RegExp(pattern, 'i');
      resolve(regex.test(input));
    } catch {
      resolve(false);
    }
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
