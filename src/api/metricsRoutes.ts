import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { MetricsCollector } from './metricsAndVersions.js';
import { register, circuitBreakerStateGauge } from '../services/metrics.js';
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
    // Dynamically update circuit breaker states before returning metrics
    const breakers = circuitBreakerRegistry.getAllBreakers();
    for (const b of breakers) {
      const stats = b.getStats();
      const stateVal = stats.state === 'CLOSED' ? 0 : stats.state === 'HALF_OPEN' ? 1 : 2;
      circuitBreakerStateGauge.set({ breaker_name: stats.name }, stateVal);
    }

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

router.get('/metrics/readiness', async (req: Request, res: Response) => {
  try {
    let metadata = { name: '', description: '', majorCapabilities: [] };
    try {
      const metaPath = path.join(process.cwd(), 'metadata.json');
      if (fs.existsSync(metaPath)) {
        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      }
    } catch (e: any) {
      // fallback
    }

    const geminiConfigured = !!process.env.GEMINI_API_KEY;
    const agentForgeConfigured = !!process.env.AGENTFORGE_API_KEY;
    const jwtSecretConfigured = !!process.env.JWT_SECRET && 
      process.env.JWT_SECRET !== 'super_secure_random_jwt_token_key_development_32_bytes';
    const encryptionKeyConfigured = !!process.env.ENCRYPTION_MASTER_KEY && 
      process.env.ENCRYPTION_MASTER_KEY !== 'bc911854ea01d2c94bb507f308a0dfce9a6b8c7d8e9f0a1b2c3d4e5f6a7b8c9d';
    const dbType = process.env.DB_TYPE || 'sqlite';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Calculate dynamic readiness score
    let score = 0;
    const checklist = [];

    // 1. Gemini key
    if (geminiConfigured) {
      score += 25;
      checklist.push({ key: 'gemini', status: 'pass', name: 'Gemini LLM Integration Key', description: 'Core LLM routing engine API key is active.' });
    } else {
      checklist.push({ key: 'gemini', status: 'fail', name: 'Gemini LLM Integration Key', description: 'Missing GEMINI_API_KEY. Prompt nodes will fail.' });
    }

    // 2. Production Database configuration
    if (dbType === 'postgres') {
      score += 25;
      checklist.push({ key: 'db', status: 'pass', name: 'Scalable PostgreSQL Engine', description: 'PostgreSQL active with full transactional safety.' });
    } else {
      checklist.push({ key: 'db', status: 'warning', name: 'SQLite Development DB', description: 'SQLite active. Recommended to use Postgres for highly concurrent production loads.' });
    }

    // 3. Secure Cryptographic Keys
    if (jwtSecretConfigured) {
      score += 15;
      checklist.push({ key: 'jwt', status: 'pass', name: 'Secure JWT Cryptographic Key', description: 'Non-default high-entropy secret active.' });
    } else {
      checklist.push({ key: 'jwt', status: 'fail', name: 'JWT Security Token', description: 'Using default development token. Severe multi-tenant vulnerability.' });
    }

    if (encryptionKeyConfigured) {
      score += 15;
      checklist.push({ key: 'encryption', status: 'pass', name: 'Zero-Trust Shield Encryption', description: 'Master encryption key for PII masking is customized.' });
    } else {
      checklist.push({ key: 'encryption', status: 'fail', name: 'Zero-Trust Encryption Key', description: 'Using fallback key. Decryption keys might be vulnerable.' });
    }

    // 4. Project Meta-data
    const isMetadataValid = !!(metadata.name && metadata.description && metadata.name !== 'My App' && metadata.name !== 'Untitled');
    if (isMetadataValid) {
      score += 10;
      checklist.push({ key: 'metadata', status: 'pass', name: 'Project Identity Metadata', description: `Valid app identity ("${metadata.name}") configured in metadata.json.` });
    } else {
      checklist.push({ key: 'metadata', status: 'warning', name: 'Project Identity Metadata', description: 'Application metadata is unset or using default placeholders.' });
    }

    // 5. Environment mode
    if (nodeEnv === 'production') {
      score += 10;
      checklist.push({ key: 'env', status: 'pass', name: 'Production Mode Compiler', description: 'Optimized build assets and strict API error guards active.' });
    } else {
      checklist.push({ key: 'env', status: 'warning', name: 'Development Server Mode', description: 'Vite middleware and detailed debugger traces are visible.' });
    }

    res.json({
      score,
      checklist,
      meta: {
        appName: metadata.name || 'Untitled',
        appDescription: metadata.description || '',
        dbType,
        nodeEnv,
        geminiConfigured,
        agentForgeConfigured
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
