import { FlowNode, RouterNode } from '../types.js';
import { testRegexWithTimeout, deepSanitizeAndFreeze } from '../utils/safe-regex.js';

function getValueByDotPath(obj: any, pathStr: string): any {
  if (!obj || !pathStr) return undefined;
  const keys = pathStr.split('.');
  let current = obj;
  for (const k of keys) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      throw new Error(`Security Violation: Prototype Pollution detected via key path "${pathStr}"`);
    }
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Executes the conditional routing logic of a router node with robust safety checks
 * (ReDoS protection and Prototype Pollution prevention).
 */
export async function routeNode(node: FlowNode, inputPayload: string): Promise<string> {
  if (node.type !== 'router') {
    return "";
  }
  // 1. Deep Sanitize and Freeze the Node Fields to prevent Prototype Pollution
  const sanitizedNode = deepSanitizeAndFreeze(node) as RouterNode;

  const conditions = sanitizedNode.fields.conditions || [];
  const defaultTargetId = sanitizedNode.fields.defaultTargetNodeId || "";
  let selectedTargetId: string | null = null;

  for (const cond of conditions) {
    if (cond.targetNodeId === '__proto__' || cond.targetNodeId === 'constructor' || cond.targetNodeId === 'prototype') {
      throw new Error("Security Violation: Prototype Pollution in targetNodeId");
    }

    if (cond.type === 'contains') {
      if (inputPayload.toLowerCase().includes((cond.value || "").toLowerCase())) {
        selectedTargetId = cond.targetNodeId;
        break;
      }
    } else if (cond.type === 'regex') {
      const pattern = cond.value || "";
      // 2. Perform ReDoS protected regex test with a 100ms timeout
      const matched = await testRegexWithTimeout(pattern, inputPayload, 100);
      if (matched) {
        selectedTargetId = cond.targetNodeId;
        break;
      }
    } else if (cond.type === 'json_key') {
      try {
        const parsedJson = JSON.parse(inputPayload);
        // Sanitize parsed JSON as well
        deepSanitizeAndFreeze(parsedJson);

        const valOfKey = getValueByDotPath(parsedJson, cond.value || "");
        if (valOfKey !== undefined && valOfKey !== null && valOfKey !== false) {
          selectedTargetId = cond.targetNodeId;
          break;
        }
      } catch (err: any) {
        console.warn("Failed to parse input payload as JSON during router node evaluation:", err.message);
      }
    }
  }

  return selectedTargetId || defaultTargetId;
}
