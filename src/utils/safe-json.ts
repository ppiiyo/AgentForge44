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
