import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { executePipeline } from './src/api/agentRun.js';
import { StatefulExecutionEngine } from './src/api/execution.js';
import { executeTool } from './src/api/tools.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-Memory Rate Limiting implementation to keep execution independent of thick external dependencies
const rateLimits: Record<string, { count: number; resetAt: number }> = {};
const LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 requests per IP/token per minute

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const limitState = rateLimits[key];
  
  if (!limitState || now > limitState.resetAt) {
    rateLimits[key] = {
      count: 1,
      resetAt: now + LIMIT_WINDOW_MS
    };
    return false;
  }
  
  limitState.count++;
  return limitState.count > MAX_REQUESTS_PER_WINDOW;
}

// Allowed Headless API Token registry
const ALLOWED_API_KEYS = new Set([
  process.env.AGENTFORGE_API_KEY || "forge_production_admin_token"
]);

/**
 * 1. Base API execution endpoint (Supports standard active canvas)
 */
app.post('/api/run-pipeline', async (req: express.Request, res: express.Response) => {
  try {
    const { nodes, connections } = req.body;
    if (!nodes || !connections) {
      res.status(400).json({ error: "Missing nodes or connections context." });
      return;
    }
    const result = await executePipeline(nodes, connections);
    res.json(result);
  } catch (err: any) {
    console.error("Pipeline run failure:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

/**
 * 2. Model Context Protocol execution connector
 */
app.post('/api/mcp/execute', async (req: express.Request, res: express.Response) => {
  try {
    const { toolName, args } = req.body;
    if (!toolName) {
      res.status(400).json({ error: "Empty tool name specification." });
      return;
    }
    const execution = await executeTool(toolName, args || {});
    res.json(execution);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Server-Sent Events (SSE) Streaming API Endpoint supporting continuous execution updates
 */
app.get('/api/stream-pipeline', async (req: express.Request, res: express.Response) => {
  // Setup SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent Nginx buffering in containers
  });

  const writeSSEEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const payloadQuery = req.query.payload as string;
    if (!payloadQuery) {
      writeSSEEvent("error", { message: "Query payload is empty." });
      res.end();
      return;
    }

    const { nodes, connections, variables } = JSON.parse(decodeURIComponent(payloadQuery));
    if (!nodes || !connections) {
      writeSSEEvent("error", { message: "Invalid graph payload parameter configurations." });
      res.end();
      return;
    }

    // Step-by-Step execution notifier tracking
    writeSSEEvent("status", { message: "Synthesizing execution path graph..." });

    const engine = new StatefulExecutionEngine(nodes, connections);
    
    // Track intermediate progression and stream chunks back directly to listener
    const runResult = await engine.runWorkflow(variables || {});
    
    writeSSEEvent("result", runResult);
    writeSSEEvent("completed", { message: "Stream closed successfully." });
    res.end();

  } catch (err: any) {
    writeSSEEvent("error", { message: err.message || "SSE system execution error." });
    res.end();
  }
});

/**
 * 4. Headless REST Runs API featuring Token Guard authentication & Auto Rate-Limiting protection
 */
app.post('/api/runs', async (req: express.Request, res: express.Response) => {
  const clientIP = req.ip || "unknown-client";
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : "";

  // 1. Authenticate Authorization Header Token
  if (!token || !ALLOWED_API_KEYS.has(token)) {
    res.status(401).json({
      success: false,
      error: "Unauthorized access: Bearer token is invalid or missing in Headers. Configure AGENTFORGE_API_KEY environment credentials to register custom tokens."
    });
    return;
  }

  // 2. Validate Rate Limits
  if (isRateLimited(token || clientIP)) {
    res.status(429).json({
      success: false,
      error: "Too Many Requests: Rate limiting triggered. Limit is 30 requests/minute."
    });
    return;
  }

  try {
    const { nodes, connections, inputs } = req.body;
    if (!nodes || !connections) {
      res.status(400).json({
        success: false,
        error: "Bad Request: specify 'nodes' and 'connections' configuration matrices."
      });
      return;
    }

    const engine = new StatefulExecutionEngine(nodes, connections);
    const trackingResult = await engine.runWorkflow(inputs || {});

    res.json({
      success: true,
      runId: `run_${Math.random().toString(36).substr(2, 9)}`,
      engine: "AgentForge44 Stateful Execution V2",
      results: trackingResult
    });

  } catch (err: any) {
    res.status(500).json({
      success: true,
      error: err.message || "Headless Run Interruption"
    });
  }
});

async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });
}

setupServer().catch(err => {
  console.error("Failed to start server:", err);
});
