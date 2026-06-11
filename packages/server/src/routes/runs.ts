import { Router, Request, Response } from "express";
import { GraphExecutor } from "../../../core/src/graph/executor.js";
import { GeminiProvider } from "../../../providers/src/gemini.js";

export const runsRouter = Router();

// Store executions states temporarily
const activeRunsTrackStore: Record<string, { status: string; state?: any; percent: number }> = {};

/**
 * Trigger dynamic headless run execution of target visual graph.
 */
runsRouter.post("/api/runs", async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Missing API authorization key token." });
  }

  const { graph, input, asyncMode } = req.body;
  if (!graph || !graph.nodes) {
    return res.status(400).json({ error: "No target Graph specifications provided." });
  }

  const runId = "run_" + Math.random().toString(36).substring(2, 9);
  activeRunsTrackStore[runId] = { status: "queued", percent: 10 };

  const geminiKey = process.env.GEMINI_API_KEY || "fallback_or_mock";
  const defaultProvider = new GeminiProvider(geminiKey);
  const executor = new GraphExecutor(graph.nodes, graph.connections || [], defaultProvider);

  if (asyncMode) {
    // Run background executing worker task safely
    ActiveBackgroundThread(runId, executor, input || {});
    return res.status(202).json({
      success: true,
      runId,
      status: "queued",
      checkStatusUrl: `/api/runs/${runId}`
    });
  }

  try {
    const endState = await executor.execute(input || {}, runId);
    activeRunsTrackStore[runId] = { status: "completed", state: endState, percent: 100 };
    return res.status(200).json({
      success: true,
      runId,
      status: "completed",
      results: endState
    });
  } catch (err: any) {
    activeRunsTrackStore[runId] = { status: "failed", percent: 100 };
    return res.status(500).json({ error: `Execution crashed: ${err.message}` });
  }
});

/**
 * Retrieve current state parameters or logs of specific run ID
 */
runsRouter.get("/api/runs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const executionInfo = activeRunsTrackStore[id];
  if (!executionInfo) {
    return res.status(404).json({ error: "No execution logs matches the given run identifier ID." });
  }
  res.json(executionInfo);
});

async function ActiveBackgroundThread(runId: string, executor: GraphExecutor, input: any) {
  try {
    activeRunsTrackStore[runId] = { status: "running", percent: 40 };
    const res = await executor.execute(input, runId);
    activeRunsTrackStore[runId] = { status: "completed", state: res, percent: 100 };
  } catch {
    activeRunsTrackStore[runId] = { status: "failed", percent: 100 };
  }
}
