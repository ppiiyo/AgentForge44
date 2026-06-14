import { Router, Request, Response } from 'express';
import { MetricsCollector } from './metricsAndVersions.js';

const router = Router();

router.get('/metrics/summary', (req: Request, res: Response) => {
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

router.get('/metrics/executions', (req: Request, res: Response) => {
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

router.get('/metrics/cost-breakdown', (req: Request, res: Response) => {
  try {
    const breakdown = MetricsCollector.getCostBreakdown();
    res.json(breakdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
