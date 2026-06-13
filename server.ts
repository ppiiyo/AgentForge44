import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { executePipeline } from './src/api/agentRun.js';
import { StatefulExecutionEngine } from './src/api/execution.js';
import { executeTool } from './src/api/tools.js';
import { runEvaluationSuite, getPatternTemplate, indexLibraryDocument, searchIndexedLibrary } from './src/api/advancedPhase4.js';
import { CodeGenerator } from './src/api/codeGenerator.js';
import { MetricsCollector, VersionManager } from './src/api/metricsAndVersions.js';
import { CollaborationServer, activeRooms, getPresenceHistory } from './src/api/collaboration.js';
import { MarketplaceManager } from './src/api/marketplace.js';
import { DeploymentManager } from './src/api/deployment.js';
import { logger } from './src/utils/logger.js';
import { setupSwagger } from './src/api/swagger.js';

dotenv.config();

const PROJECTS_DIR = path.join(process.cwd(), 'projects');
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

export const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({
  origin: true,
  credentials: true
}));

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 10000 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiRateLimiter);

app.use(express.json());

// Setup OpenAPI Documentation
setupSwagger(app);


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
 * @swagger
 * /api/health:
 *   get:
 *     summary: Retrieve server health status
 *     description: Health check endpoint for verifying server status and connections.
 *     responses:
 *       200:
 *         description: Server is online and healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

/**
 * Projects Persistence: Save, List, and Load active Flow Graph Workspace
 */
app.get('/api/projects', async (req: express.Request, res: express.Response) => {
  try {
    const files = await fsPromises.readdir(PROJECTS_DIR);
    const projectsList = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(PROJECTS_DIR, file);
          const raw = await fsPromises.readFile(filePath, 'utf-8');
          const content = JSON.parse(raw);
          const stats = await fsPromises.stat(filePath);
          projectsList.push({
            id: file.replace('.json', ''),
            name: content.name || file.replace('.json', ''),
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
            nodes: content.nodes || [],
            connections: content.connections || []
          });
        } catch {}
      }
    }
    res.json(projectsList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req: express.Request, res: express.Response) => {
  try {
    const { name, nodes, connections } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: "Valid project name is required" });
      return;
    }
    const safeName = name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || "untitled_project";
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    const payload = {
      name: safeName,
      nodes: nodes || [],
      connections: connections || [],
      savedAt: new Date().toISOString()
    };
    await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    res.json({ success: true, name: safeName, message: "Project saved successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Alias endpoints for Graphs matching automated Integration Tests Specification
 */
app.post('/api/graphs', async (req: express.Request, res: express.Response) => {
  try {
    const { id, name, nodes, connections } = req.body;
    const projName = id || name || "untitled_graph";
    const safeName = projName.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || "untitled_graph";
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    const payload = {
      id: safeName,
      name: safeName,
      nodes: nodes || [],
      connections: connections || [],
      savedAt: new Date().toISOString()
    };
    await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    res.status(201).json({ success: true, id: safeName, name: safeName, nodes, connections });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/graphs/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const safeName = id.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      const raw = await fsPromises.readFile(filePath, 'utf-8');
      const content = JSON.parse(raw);
      res.json({
        id: safeName,
        name: content.name || safeName,
        nodes: content.nodes || [],
        connections: content.connections || []
      });
    } else {
      res.status(404).json({ error: "Graph not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/graphs/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { name, nodes, connections } = req.body;
    const safeName = id.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      const payload = {
        id: safeName,
        name: name || safeName,
        nodes: nodes || [],
        connections: connections || [],
        savedAt: new Date().toISOString()
      };
      await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.json({ success: true, id: safeName, name: name || safeName, nodes, connections });
    } else {
      res.status(404).json({ error: "Graph not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/graphs/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const safeName = id.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
      res.json({ success: true, message: `Graph ${safeName} has been deleted.` });
    } else {
      res.status(404).json({ error: "Graph not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Alias POST /api/execute referencing testing specs
 */
app.post('/api/execute', async (req: express.Request, res: express.Response) => {
  const { nodes, connections } = req.body;
  if (!nodes || !connections) {
    res.status(400).json({ error: "Missing nodes or connections context." });
    return;
  }
  try {
    const result = await executePipeline(nodes, connections);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Execution error" });
  }
});

app.delete('/api/projects/:name', async (req: express.Request, res: express.Response) => {
  try {
    const { name } = req.params;
    const safeName = name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
      res.json({ success: true, message: `Project ${safeName} has been deleted.` });
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Projects Code Generator: Exports any visual node graph to executable script
 */
app.post('/api/projects/export', (req: express.Request, res: express.Response) => {
  try {
    const { nodes, connections, language } = req.body;
    if (!nodes || !connections) {
      res.status(400).json({ error: "Missing required workflow nodes and connections." });
      return;
    }
    const targetLang = language === 'python' ? 'python' : 'typescript';
    let codeStr = "";
    if (targetLang === 'python') {
      codeStr = CodeGenerator.generatePython(nodes, connections);
    } else {
      codeStr = CodeGenerator.generateTypeScript(nodes, connections);
    }
    res.json({ success: true, language: targetLang, code: codeStr });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Phase 4 Endpoint: Loader of Pre-Packaged Multi-Agent Architectures
 */
app.get('/api/patterns/:type', (req: express.Request, res: express.Response) => {
  try {
    const { type } = req.params;
    if (type !== 'supervisor' && type !== 'debate') {
      res.status(405).json({ error: "Unsupported architecture pattern type requested." });
      return;
    }
    const nodesAndConns = getPatternTemplate(type);
    res.json(nodesAndConns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Phase 4 Endpoint: Interactive LLM-as-a-Judge Evaluation Suite Runner
 */
app.post('/api/evals', async (req: express.Request, res: express.Response) => {
  try {
    const { nodes, connections, testCases } = req.body;
    if (!nodes || !connections || !testCases || !Array.isArray(testCases)) {
      res.status(400).json({ error: "Missing required inputs evaluation parameters." });
      return;
    }

    const reportResult = await runEvaluationSuite(nodes, connections, testCases);
    res.json(reportResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Internal evaluation server error." });
  }
});

/**
 * Phase 4 Endpoint: Index knowledge documents for RAG context retention
 */
app.post('/api/rag/index', (req: express.Request, res: express.Response) => {
  try {
    const { text, source } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text payload empty, cannot build index." });
      return;
    }

    const indexRes = indexLibraryDocument(text, source || "UI Document Upload");
    res.json(indexRes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Phase 4 Endpoint: Query search results Jaccard approximate vector matrix matching
 */
app.get('/api/rag/search', (req: express.Request, res: express.Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: "No search term query parameter provided." });
      return;
    }

    const results = searchIndexedLibrary(query);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 1. Base API execution endpoint (Supports standard active canvas)
 */
app.post('/api/run-pipeline', async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  const { nodes, connections, graphId, graphName } = req.body;
  try {
    if (!nodes || !connections) {
      res.status(400).json({ error: "Missing nodes or connections context." });
      return;
    }
    const result = await executePipeline(nodes, connections);
    
    // Log successfully finished metrics workflow in telemetry store
    await MetricsCollector.logExecution(
      graphId || 'canvas-workspace',
      graphName || 'Workspace Canvas',
      'success',
      startTime,
      result.logs || []
    );

    res.json(result);
  } catch (err: any) {
    logger.error("Pipeline run failure:", { error: err.message || err });
    
    // Log failed metrics workflow in telemetry store
    await MetricsCollector.logExecution(
      graphId || 'canvas-workspace',
      graphName || 'Workspace Canvas',
      'failed',
      startTime,
      [],
      err.message || String(err)
    );

    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

/**
 * Step 3 - Metrics and Analytics Dashboard Endpoints
 */
app.get('/api/metrics/summary', (req: express.Request, res: express.Response) => {
  try {
    const periodQuery = req.query.period as string;
    let periodDays = 7;
    if (periodQuery === '24h') periodDays = 1;
    else if (periodQuery === '30d') periodDays = 30;
    
    const summary = MetricsCollector.getSummary(periodDays);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/metrics/executions', (req: express.Request, res: express.Response) => {
  try {
    const graphId = req.query.graph_id as string;
    if (!graphId) {
      res.status(400).json({ error: "Missing graph_id query parameter." });
      return;
    }
    const list = MetricsCollector.getExecutionsByGraph(graphId);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/metrics/cost-breakdown', (req: express.Request, res: express.Response) => {
  try {
    const breakdown = MetricsCollector.getCostBreakdown();
    res.json(breakdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Step 4 - Git-like Graph Version Control Endpoints
 */
app.post('/api/graphs/:id/versions', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { message, author, snapshot } = req.body;
    if (!snapshot) {
      res.status(400).json({ error: "Missing required workflow snapshot state to commit." });
      return;
    }
    const newVer = VersionManager.commit(id, message, author, snapshot);
    res.json(newVer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/graphs/:id/versions', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const versions = VersionManager.getVersions(id);
    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/graphs/:id/rollback/:versionId', (req: express.Request, res: express.Response) => {
  try {
    const { id, versionId } = req.params;
    const restored = VersionManager.rollback(id, versionId);
    res.json({ success: true, restored });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/graphs/:id/diff', (req: express.Request, res: express.Response) => {
  try {
    const v1 = req.query.v1 as string;
    const v2 = req.query.v2 as string;
    if (!v1 || !v2) {
      res.status(400).json({ error: "Query parameters v1 and v2 are required for diff operation." });
      return;
    }
    const difference = VersionManager.computeDiff(v1, v2);
    res.json(difference);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/graphs/:id/presence', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const online = activeRooms[id] ? Object.values(activeRooms[id]) : [];
    const history = getPresenceHistory(id);
    res.json({ online, history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Step 6 - Marketplace endpoints
 */
app.get('/api/marketplace', (req: express.Request, res: express.Response) => {
  try {
    const category = req.query.category as string;
    const tag = req.query.tag as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;
    const items = MarketplaceManager.getItems(category, tag, search, sortBy);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marketplace/featured', (req: express.Request, res: express.Response) => {
  try {
    const items = MarketplaceManager.getFeatured();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marketplace/:id', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const item = MarketplaceManager.getItemById(id);
    if (!item) {
      res.status(404).json({ error: "Marketplace item not found" });
      return;
    }
    const reviews = MarketplaceManager.getReviews(id);
    res.json({ item, reviews });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marketplace', (req: express.Request, res: express.Response) => {
  try {
    const { title, description, category, graphSnapshot, tags, authorId } = req.body;
    if (!title || !category || !graphSnapshot) {
      res.status(400).json({ error: "Title, category, and graphSnapshot are required properties." });
      return;
    }
    const item = MarketplaceManager.publishItem(title, description, category, graphSnapshot, tags || [], authorId);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marketplace/:id/download', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const updatedItem = MarketplaceManager.incrementDownload(id);
    res.json({ success: true, graphSnapshot: updatedItem.graphSnapshot, downloadsCount: updatedItem.downloadsCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/marketplace/:id/reviews', (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { userId, rating, comment } = req.body;
    if (rating === undefined || rating < 1 || rating > 5 || !comment) {
      res.status(400).json({ error: "Rating (1-5) and a written comment are required." });
      return;
    }
    const review = MarketplaceManager.addReview(id, userId, rating, comment);
    res.json(review);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Step 7 - One-Click Cloud Deployments
 */
app.post('/api/deploy', async (req: express.Request, res: express.Response) => {
  try {
    const { graphId, graphName, provider, config } = req.body;
    if (!graphId || !graphName || !provider || !config) {
      res.status(400).json({ error: "Parameters graphId, graphName, provider, and config are required." });
      return;
    }
    const deployment = await DeploymentManager.startDeployment(graphId, graphName, provider, config);
    res.json(deployment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deploy/list', (req: express.Request, res: express.Response) => {
  try {
    const graphId = req.query.graphId as string;
    const deployments = DeploymentManager.getDeployments(graphId);
    res.json(deployments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deploy/:id/status', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const dep = DeploymentManager.getDeploymentById(id);
    if (!dep) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    const status = await DeploymentManager.getStatus(id);
    res.json({ id, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deploy/:id/logs', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const logs = await DeploymentManager.getLogs(id);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/deploy/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const success = await DeploymentManager.stopDeployment(id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Express custom server running on http://localhost:${PORT}`);
  });

  // Start Socket.io Collaboration Server
  new CollaborationServer(httpServer);
}

if (process.env.NODE_ENV !== "test") {
  setupServer().catch(err => {
    logger.error("Failed to start server:", { error: err.message || err });
  });
}
