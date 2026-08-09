/**
 * Safe JSON parsing utility to protect against Prototype Pollution attacks (CWE-1321).
 * Detects and blocks dangerous keys like '__proto__', 'constructor', 'prototype'
 * inside JSON structures. Employs a custom reviver to filter or strip these properties.
 */
export function safeJsonParse(text: string, defaultValue?: any): any {
  if (text === undefined || text === null) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error("Cannot parse null or undefined JSON string");
  }

  const trimmed = text.trim();
  if (trimmed === "") {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error("Cannot parse empty JSON string");
  }

  try {
    const parsed = JSON.parse(trimmed, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        // Clean or strip the property to prevent prototype contamination
        return undefined;
      }
      return value;
    });
    return parsed;
  } catch (err: any) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw err;
  }
}

/**
 * Recursively checks if an object contains keys that could pollute the prototype chain.
 */
export function hasProtoPollution(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return true;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (hasProtoPollution(obj[key])) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Deep merge utility that is safe from Prototype Pollution.
 */
export function safeDeepMerge(target: any, source: any): any {
  if (!source) return target;
  if (!target) return source;

  const output = { ...target };

  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue; // Block keys that can cause Prototype Pollution
    }

    const sourceValue = source[key];
    const targetValue = target[key];

    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        output[key] = safeDeepMerge(targetValue, sourceValue);
      } else {
        output[key] = safeDeepMerge({}, sourceValue);
      }
    } else {
      output[key] = sourceValue;
    }
  }

  return output;
}

/**
 * Safe JSON stringify utility that prevents "TypeError: JSON.stringify cannot serialize cyclic structures"
 * and gracefully converts UI events or circular references.
 */
export function safeJsonStringify(obj: any, space?: number | string): string {
  if (obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  if (obj instanceof Error) return obj.message || String(obj);
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        if (typeof value === 'function') {
          return '[Function]';
        }
        if (typeof value === 'symbol') {
          return value.toString();
        }
        if (value instanceof Error) {
          return value.message || String(value);
        }
        if (typeof value === 'object' && value !== null) {
          if (value._reactName || value._targetInst || value.nativeEvent || value.target || value.preventDefault || value.currentTarget) {
            return '[UI Event]';
          }
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      },
      space
    );
  } catch (_) {
    return '[Unserializable]';
  }
}

/**
 * Deep clone utility that handles cyclic references safely without throwing.
 */
export function safeClone<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  try {
    return safeJsonParse(safeJsonStringify(obj));
  } catch (_) {
    return obj;
  }
}

