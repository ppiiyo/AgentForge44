import { Router, Request, Response } from 'express';
import { executePipeline } from './agentRun.js';
import { validateBody, PipelineExecuteSchema } from '../utils/validation.js';
import { StatefulExecutionEngine } from './execution.js';
import { runEvaluationSuite } from './advancedPhase4.js';
import { MetricsCollector } from './metricsAndVersions.js';
import { triggerWebhook } from '../webhooks/index.js';
import { recordDebugSession } from '../utils/debugSessions.js';
import { logger } from '../utils/logger.js';
import { slidingWindowRateLimiter } from '../middleware/rateLimit.js';
import { checkSlidingWindow } from '../services/usage-tracker.js';
import { generateSecureId } from '../utils/idGenerator.js';
import { requireRole } from './authRoutes.js';
import { enqueuePipelineRun } from '../queue/executionQueue.js';
import { db, tables } from '../db/index.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Apply sliding window rate limiting middleware to all execution routes
router.use(slidingWindowRateLimiter);

// Master API Key resolver
const ALLOWED_API_KEYS = new Set(
  process.env.AGENTFORGE_API_KEY ? [process.env.AGENTFORGE_API_KEY] : []
);

router.post('/execute', requireRole(['editor', 'owner']), validateBody(PipelineExecuteSchema), async (req: Request, res: Response) => {
  const { nodes, connections } = req.body;
  try {
    const result = await executePipeline(nodes, connections);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Execution error" });
  }
});

router.post('/run-pipeline', requireRole(['editor', 'owner']), validateBody(PipelineExecuteSchema), async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { nodes, connections, graphId, graphName } = req.body;
  
  const gId = graphId || 'canvas-workspace';
  const gName = graphName || 'Workspace Canvas';

  try {

    // Trigger starting webhook
    await triggerWebhook('graph.started', {
      graphId: gId,
      graphName: gName,
      timestamp: new Date()
    });

    const result = await executePipeline(nodes, connections);
    
    // Log successfully finished metrics workflow in telemetry store
    await MetricsCollector.logExecution(
      gId,
      gName,
      'success',
      startTime,
      result.logs || []
    );

    // Record debugging replay session snapshots
    const dbgSession = recordDebugSession(
      gId,
      gName,
      result.logs || [],
      result.finalResult || ""
    );

    // Trigger success webhook
    await triggerWebhook('graph.completed', {
      graphId: gId,
      graphName: gName,
      result,
      timestamp: new Date()
    });

    res.json({
      ...result,
      debugSessionId: dbgSession.id
    });
  } catch (err: any) {
    logger.error("Pipeline run failure:", { error: err.message || err });
    
    // Log failed metrics workflow in telemetry store
    await MetricsCollector.logExecution(
      gId,
      gName,
      'failed',
      startTime,
      [],
      err.message || String(err)
    );

    // Trigger failure webhook
    await triggerWebhook('graph.failed', {
      graphId: gId,
      graphName: gName,
      error: err.message || String(err),
      timestamp: new Date()
    });

    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post('/evals', requireRole(['editor', 'owner']), async (req: Request, res: Response) => {
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

router.post('/stream-pipeline', requireRole(['editor', 'owner']), async (req: Request, res: Response) => {
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
    const { nodes, connections, variables } = req.body;
    if (!nodes || !connections) {
      writeSSEEvent("error", { message: "Invalid graph payload parameter configurations." });
      res.end();
      return;
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const engine = new StatefulExecutionEngine(nodes, connections, userId);
    
    // Track intermediate progression and stream chunks back directly to listener
    const runResult = await engine.runWorkflow(variables || {});
    
    writeSSEEvent("result", runResult);
    writeSSEEvent("completed", { message: "Stream closed successfully." });
    res.end();

  } catch (err: any) {
    if (err.status === 429 || err.message?.includes("Budget Exceeded")) {
      writeSSEEvent("error", { message: "429 Budget Exceeded" });
    } else {
      writeSSEEvent("error", { message: err.message || "SSE system execution error." });
    }
    res.end();
  }
});

router.post('/runs', validateBody(PipelineExecuteSchema), async (req: Request, res: Response) => {
  const clientIP = req.ip || "unknown-client";
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : "";

  // 1. Authenticate Authorization Header Token (allowing test environment fallback)
  const API_KEY = process.env.AGENTFORGE_API_KEY;
  if (!token || (token !== API_KEY && (!API_KEY || !ALLOWED_API_KEYS.has(token)))) {
    res.status(401).json({
      success: false,
      error: "Unauthorized access: Bearer token is invalid or missing in Headers. Configure AGENTFORGE_API_KEY environment credentials to register custom tokens."
    });
    return;
  }

  // 2. Validate Rate Limits with Sliding Window
  const rateLimitKey = token ? `apikey-${token}` : `ip-${clientIP}`;
  const isAllowed = checkSlidingWindow(rateLimitKey, 30, 60 * 1000);
  if (!isAllowed) {
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

    const runId = generateSecureId('run');
    await enqueuePipelineRun(runId, nodes, connections, inputs || {});

    res.status(202).json({
      success: true,
      runId: runId,
      status: "pending"
    });

  } catch (err: any) {
    if (err.status === 429 || err.message?.includes("Budget Exceeded")) {
      res.status(429).json({
        success: false,
        error: "429 Budget Exceeded"
      });
    } else {
      res.status(500).json({
        success: false,
        error: err.message || "Headless Run Interruption"
      });
    }
  }
});

router.get('/runs/:id', async (req: Request, res: Response) => {
  try {
    const run = await db.select().from(tables.pipelineRuns).where(eq(tables.pipelineRuns.id, req.params.id)).limit(1);
    if (run.length === 0) {
      res.status(404).json({ success: false, error: "Pipeline run not found." });
      return;
    }
    const data = run[0];
    const logs = JSON.parse(data.logs || '[]');
    const nodeOutputs = JSON.parse(data.nodeOutputs || '{}');
    
    // Resolve finalResult matching the expected synchronous result structure if completed
    let finalResult = "";
    if (data.status === 'completed') {
      const lastOutput = nodeOutputs['lastOutput'] || Object.values(nodeOutputs).pop();
      finalResult = typeof lastOutput === 'string' ? lastOutput : JSON.stringify(lastOutput || "");
    }

    res.json({
      success: true,
      id: data.id,
      status: data.status,
      completedNodes: JSON.parse(data.completedNodes || '[]'),
      activatedNodes: JSON.parse(data.activatedNodes || '[]'),
      nodeOutputs,
      logs,
      error: data.error,
      results: {
        logs,
        finalResult
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/runs/:id/resume', async (req: Request, res: Response) => {
  try {
    const runId = req.params.id;
    const run = await db.select().from(tables.pipelineRuns).where(eq(tables.pipelineRuns.id, runId)).limit(1);
    if (run.length === 0) {
      res.status(404).json({ success: false, error: "Pipeline run not found." });
      return;
    }
    const data = run[0];
    if (data.status !== 'failed') {
      res.status(400).json({ success: false, error: `Only failed runs can be resumed. Current status: ${data.status}` });
      return;
    }

    const { nodes, connections } = req.body;
    if (!nodes || !connections) {
      res.status(400).json({ success: false, error: "Nodes and connections are required to resume." });
      return;
    }

    // Update status to pending/running
    await db.update(tables.pipelineRuns).set({
      status: 'pending',
      error: null,
      updatedAt: new Date().toISOString()
    }).where(eq(tables.pipelineRuns.id, runId));

    await enqueuePipelineRun(runId, nodes, connections, JSON.parse(data.variables || '{}'));

    res.json({
      success: true,
      runId: runId,
      status: 'pending'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/llm-providers:
 *   get:
 *     summary: Retrieve the list of active model providers and schemas
 *     description: Returns the dynamic registry of supported models from the backend.
 *     responses:
 *       200:
 *         description: A JSON array of active provider objects.
 */
router.get('/llm-providers', (req: Request, res: Response) => {
  res.json([
    {
      id: "google",
      name: "Google Gemini",
      models: [
        { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Default, recommended)", speed: "Fast", cost: "Low" },
        { id: "gemini-3.5-pro", name: "Gemini 3.5 Pro (Complex Reasoning)", speed: "Balanced", cost: "Medium" },
        { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite (High scalability layer)", speed: "Ultra-fast", cost: "Very Low" }
      ]
    },
    {
      id: "openai",
      name: "OpenAI GPT",
      models: [
        { id: "gpt-4o-mini", name: "GPT-4o Mini", speed: "Fast", cost: "Low" },
        { id: "gpt-4o", name: "GPT-4o (Reasoning)", speed: "Balanced", cost: "Medium" },
        { id: "o1-mini", name: "o1 Mini (Developer)", speed: "Specialized", cost: "Medium" }
      ]
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      models: [
        { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", speed: "Balanced", cost: "Medium-High" },
        { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", speed: "Fast", cost: "Low" }
      ]
    },
    {
      id: "ollama",
      name: "Ollama (Offline Local)",
      models: [
        { id: "llama3", name: "Llama 3 (8B Local)", speed: "Hardware dependent", cost: "Free/Local" },
        { id: "mistral", name: "Mistral (7B Local)", speed: "Hardware dependent", cost: "Free/Local" }
      ]
    }
  ]);
});

// isolated-vm specific nodes runner mapping
import { getSandbox, releaseSandbox } from '../utils/sandbox.js';

router.post('/execute-node/:runId', requireRole(['editor', 'owner']), async (req: Request, res: Response) => {
  const { runId } = req.params;
  const { code, inputData } = req.body;
  
  const sandbox = getSandbox(runId);
  const wrappedCode = `
    (async () => {
      const input = ${JSON.stringify(inputData)};
      ${code}
    })()
  `;
  
  const result = await sandbox.execute(wrappedCode, 10000);
  
  if (!result.success) {
    releaseSandbox(runId);
    return res.status(400).json({ error: result.error });
  }
  
  res.json(result);
});

router.post('/complete-run/:runId', requireRole(['editor', 'owner']), (req: Request, res: Response) => {
  releaseSandbox(req.params.runId);
  res.json({ success: true });
});

export default router;
