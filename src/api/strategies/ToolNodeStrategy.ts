/* eslint-disable @typescript-eslint/no-explicit-any -- Ticket #104: Dynamic workflow node execution and field mapping */
import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';
import { TemplateEngine } from '../services/TemplateEngine.js';
import { validateUrl } from '../../utils/ssrf-validator.js';
import { safeJsonParse } from '../../utils/safe-json.js';

export class ToolNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const urlRaw = node.fields.url || "";
    const method = node.fields.method || "GET";
    const headersRaw = node.fields.headers || "{}";
    const bodyRaw = node.fields.body || "";

    const data = {
      ...context.globalVariables,
      lastOutput: typeof context.localValue === 'string' ? context.localValue : JSON.stringify(context.localValue),
    };

    const substitute = (text: string) => {
      if (!text) return "";
      // Standardize single curlies to double curlies safely for TemplateEngine
      const normalized = text.replace(/\{([a-zA-Z0-9_.-]+)\}/g, '{{$1}}');
      return TemplateEngine.render(normalized, data);
    };

    const url = substitute(urlRaw);
    const body = substitute(bodyRaw);
    const headersStr = substitute(headersRaw);

    let headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      if (headersStr.trim().startsWith("{")) {
        headers = { ...headers, ...safeJsonParse(headersStr) };
      }
    } catch {
      // safe fallback
    }

    const fetchOptions: any = { method, headers };
    if (method !== 'GET' && body) {
      fetchOptions.body = body;
    }

    let responseText = "";
    let responseStatus = 250;
    try {
      await validateUrl(url);
      const fetchRes = await fetch(url, fetchOptions);
      responseStatus = fetchRes.status;
      responseText = await fetchRes.text();
    } catch (err: any) {
      if (err.message && err.message.startsWith("SSRF attempt blocked:")) {
        throw err;
      }
      throw new Error(`HTTP Tool node failed: ${err.message || String(err)}`);
    }

    context.nodeOutputs[node.id] = responseText;
    context.activeValueReference.value = responseText;

    context.logs.push({
      nodeId: node.id,
      nodeTitle: `${node.title} (${method} ${responseStatus})`,
      status: 'completed',
      input: `URL: ${url}\nBody: ${body || 'None'}`,
      output: responseText,
      duration: Date.now() - context.stepStart
    });
  }
}
