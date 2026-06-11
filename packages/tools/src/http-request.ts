export const HttpRequestSchema = {
  name: "http_request",
  description: "Initiate web GET or POST parameters integrations with external services.",
  parameters: {
    type: "OBJECT",
    properties: {
      url: { type: "STRING", description: "Target address web service URL." },
      method: { type: "STRING", enum: ["GET", "POST"], description: "The execution HTTP method." },
      headers: { type: "OBJECT", description: "Optional HTTP header dictionary mapping." },
      body: { type: "STRING", description: "Dynamic JSON string data payload for POST triggers." }
    },
    required: ["url", "method"]
  }
};

export async function executeHttpRequest(
  url: string,
  method: "GET" | "POST",
  headers?: Record<string, string>,
  body?: string
): Promise<string> {
  try {
    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(headers || {})
      }
    };

    if (method === "POST" && body) {
      config.body = body;
    }

    const res = await fetch(url, config);
    const text = await res.text();
    return `Status Code: ${res.status}\nResponse: ${text.slice(0, 2000)}`;
  } catch (err: any) {
    return `HTTP Request failed: ${err.message}`;
  }
}
