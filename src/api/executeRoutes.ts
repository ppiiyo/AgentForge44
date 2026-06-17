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

const router = Router();

// Apply sliding window rate limiting middleware to all execution routes
router.use(slidingWindowRateLimiter);

// Master API Key resolver
const ALLOWED_API_KEYS = new Set(
  process.env.AGENTFORGE_API_KEY ? [process.env.AGENTFORGE_API_KEY] : []
);

router.post('/execute', validateBody(PipelineExecuteSchema), async (req: Request, res: Response) => {
  const { nodes, connections } = req.body;
  try {
    const result = await executePipeline(nodes, connections);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Execution error" });
  }
});

router.post('/run-pipeline', validateBody(PipelineExecuteSchema), async (req: Request, res: Response) => {
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

router.post('/evals', async (req: Request, res: Response) => {
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

router.get('/stream-pipeline', async (req: Request, res: Response) => {
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

    const userId = (req as any).user?.id || 'anonymous';
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

    const userId = (req as any).user?.id || 'anonymous';
    const engine = new StatefulExecutionEngine(nodes, connections, userId);
    const trackingResult = await engine.runWorkflow(inputs || {});

    res.json({
      success: true,
      runId: `run_${Math.random().toString(36).substr(2, 9)}`,
      engine: "AgentForge44 Stateful Execution V2",
      results: trackingResult
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

export default router;
