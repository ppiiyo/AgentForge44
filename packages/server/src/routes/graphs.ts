import { Router, Request, Response } from "express";
import { workflows } from "../../../db/src/schema.js";

export const graphRouter = Router();

// Simulated memory store/db for simple single-file deployment
let memoryWorkflows: Record<string, any> = {};

/**
 * GET all visual graphs/workflows
 */
graphRouter.get("/api/graphs", (req: Request, res: Response) => {
  res.json(Object.values(memoryWorkflows));
});

/**
 * GET unique workflow by ID
 */
graphRouter.get("/api/graphs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const workflow = memoryWorkflows[id];
  if (!workflow) {
    return res.status(404).json({ error: "Graph configuration not found." });
  }
  res.json(workflow);
});

/**
 * POST / Create or update configuration graph
 */
graphRouter.post("/api/graphs", (req: Request, res: Response) => {
  const { id, name, description, nodes, connections } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: "Missing required properties: id, name." });
  }

  const payload = {
    id,
    name,
    description: description || "",
    nodes: nodes || [],
    connections: connections || [],
    updatedAt: Date.now()
  };

  memoryWorkflows[id] = payload;
  res.status(201).json({ success: true, graph: payload });
});

/**
 * DELETE workflow
 */
graphRouter.delete("/api/graphs/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (memoryWorkflows[id]) {
    delete memoryWorkflows[id];
    return res.json({ success: true, message: "Graph removed successfully." });
  }
  res.status(404).json({ error: "Graph configuration target not found." });
});
