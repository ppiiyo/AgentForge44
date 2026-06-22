import { Router, Request, Response } from 'express';
import { MetricsCollector } from './metricsAndVersions.js';
import { register } from '../services/metrics.js';

const router = Router();

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).end(err.message);
  }
});

router.get('/metrics/summary', async (req: Request, res: Response) => {
  try {
    const periodQuery = req.query.period as string;
    let periodDays = 7;
    if (periodQuery === '24h') periodDays = 1;
    else if (periodQuery === '30d') periodDays = 30;
    
    const result = MetricsCollector.getSummary(periodDays);
    const summary = result instanceof Promise ? await result : result;
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/metrics/executions', async (req: Request, res: Response) => {
  try {
    const graphId = req.query.graph_id as string;
    if (!graphId) {
      res.status(400).json({ error: "Missing graph_id query parameter." });
      return;
    }
    const result = MetricsCollector.getExecutionsByGraph(graphId);
    const list = result instanceof Promise ? await result : result;
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/metrics/cost-breakdown', async (req: Request, res: Response) => {
  try {
    const result = MetricsCollector.getCostBreakdown();
    const breakdown = result instanceof Promise ? await result : result;
    res.json(breakdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
