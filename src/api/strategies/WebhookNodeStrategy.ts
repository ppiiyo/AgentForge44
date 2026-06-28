/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic workflow webhook node execution and dynamic templates */
import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';
import { TemplateEngine } from '../services/TemplateEngine.js';
import { validateUrl } from '../../utils/ssrf-validator.js';
import { safeJsonParse } from '../../utils/safe-json.js';

export class WebhookNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const urlRaw = node.fields.url || "";
    const method = "POST"; // Webhook nodes always do POST
    const headersRaw = node.fields.headers || "{}";
    const bodyRaw = node.fields.body || "";
    const tokenRaw = node.fields.token || "";

    const data = {
      ...context.globalVariables,
      lastOutput: typeof context.localValue === 'string' ? context.localValue : JSON.stringify(context.localValue),
      nodeId: node.id,
      nodeTitle: node.title,
    };

    const substitute = (text: string) => {
      if (!text) return "";
      const normalized = text.replace(/\{([a-zA-Z0-9_.-]+)\}/g, '{{$1}}');
      return TemplateEngine.render(normalized, data);
    };

    const url = substitute(urlRaw);
    const body = substitute(bodyRaw);
    const headersStr = substitute(headersRaw);
    const token = substitute(tokenRaw);

    let headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      if (headersStr.trim().startsWith("{")) {
        headers = { ...headers, ...safeJsonParse(headersStr) };
      }
    } catch {
      // safe fallback
    }

    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }

    const fetchOptions: any = { method, headers };
    if (body) {
      fetchOptions.body = body;
    }

    let responseText = "";
    let responseStatus = 200;
    try {
      await validateUrl(url);
      const fetchRes = await fetch(url, fetchOptions);
      responseStatus = fetchRes.status;
      responseText = await fetchRes.text();
    } catch (err: any) {
      if (err.message && err.message.startsWith("SSRF attempt blocked:")) {
        throw err;
      }
      throw new Error(`Webhook node trigger failed: ${err.message || String(err)}`);
    }

    context.nodeOutputs[node.id] = responseText;
    context.activeValueReference.value = responseText;

    context.logs.push({
      nodeId: node.id,
      nodeTitle: `${node.title} (Webhook POST ${responseStatus})`,
      status: 'completed',
      input: `URL: ${url}\nAuth: ${token ? 'Bearer active token' : 'None'}\nPayload: ${body || 'None'}`,
      output: responseText,
      duration: Date.now() - context.stepStart
    });
  }
}
