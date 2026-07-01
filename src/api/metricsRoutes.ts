import { Router, Request, Response } from 'express';
import { MetricsCollector } from './metricsAndVersions.js';
import { register } from '../services/metrics.js';
import { circuitBreakerRegistry } from '../services/circuitBreaker.js';
import { chaosEngine } from '../services/chaosEngine.js';

const router = Router();

// Retrieve all circuit breakers and their real-time states
router.get('/resilience/circuit-breakers', (req: Request, res: Response) => {
  try {
    const breakers = circuitBreakerRegistry.getAllBreakers();
    res.json(breakers.map(b => b.getStats()));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve active Chaos Engineering configurations
router.get('/resilience/chaos-config', (req: Request, res: Response) => {
  try {
    res.json(chaosEngine.getConfig());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update active Chaos Engineering configurations
router.post('/resilience/chaos-config', (req: Request, res: Response) => {
  try {
    chaosEngine.updateConfig(req.body);
    res.json({ success: true, config: chaosEngine.getConfig() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Chaos Engineering to pristine state
router.post('/resilience/chaos-reset', (req: Request, res: Response) => {
  try {
    chaosEngine.reset();
    res.json({ success: true, config: chaosEngine.getConfig() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
