import { Router, Request, Response } from 'express';
import { executeTool } from './tools.js';

const router = Router();

router.post('/mcp/execute', async (req: Request, res: Response) => {
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

export default router;
