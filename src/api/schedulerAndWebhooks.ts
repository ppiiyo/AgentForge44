import { Router } from 'express';
import { createSchedule, deleteSchedule, toggleSchedule, listSchedules } from '../scheduler/index.js';
import { registerWebhook, removeWebhook, toggleWebhook, listWebhooks } from '../webhooks/index.js';
import { importFromLangFlow, importFromFlowise } from '../utils/importer.js';
import { LangChainExporter } from '../utils/langchainExporter.js';
import { getDebugSession, listDebugSessions, clearDebugSessions, updateDebugSnapshot } from '../utils/debugSessions.js';

const router = Router();

// ================= SYNC CONFIGS =================

// Debugger Session routes
router.get('/debug/sessions', (req, res) => {
  res.json(listDebugSessions());
});

router.get('/debug/sessions/:id', (req, res) => {
  const session = getDebugSession(req.params.id);
  if (session) {
    res.json(session);
  } else {
    res.status(404).json({ error: 'Debugging session not found' });
  }
});

router.delete('/debug/sessions', (req, res) => {
  clearDebugSessions();
  res.json({ success: true, message: 'All debugging history cleared successfully' });
});

router.post('/debug/sessions/:id/step/:stepIndex', (req, res) => {
  const { id, stepIndex } = req.params;
  const { inputsState, outputsState } = req.body;
  
  const success = updateDebugSnapshot(
    id,
    parseInt(stepIndex),
    inputsState,
    outputsState
  );
  
  if (success) {
    res.json({ success: true, message: 'Step snapshot updated successfully.' });
  } else {
    res.status(404).json({ error: 'Session or step snapshot not found.' });
  }
});

// Import from external platforms
router.post('/projects/import', (req, res) => {
  const { type, fileData } = req.body;
  if (!type || !fileData) {
    res.status(400).json({ error: 'Missing type or fileData structure for import' });
    return;
  }
  
  try {
    let result;
    if (type === 'langflow') {
      result = importFromLangFlow(fileData);
    } else if (type === 'flowise') {
      result = importFromFlowise(fileData);
    } else {
      res.status(400).json({ error: 'Unsupported import type format. Must be "langflow" or "flowise"' });
      return;
    }
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

// Export to Python LangChain LCEL script
router.post('/projects/export-langchain', (req, res) => {
  const { nodes, connections } = req.body;
  if (!nodes || !connections) {
    res.status(400).json({ error: 'Missing nodes or connections context' });
    return;
  }

  try {
    const code = LangChainExporter.generatePythonLangChain(nodes, connections);
    res.json({ success: true, language: 'python', framework: 'langchain_lcel', code });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Export failed' });
  }
});

// Scheduler routes
router.post('/schedules', (req, res) => {
  const { graphId, cronExpression, graphName } = req.body;
  if (!graphId || !cronExpression) {
    res.status(400).json({ error: 'Missing graphId or cronExpression' });
    return;
  }
  try {
    const config = createSchedule(graphId, cronExpression, graphName);
    res.status(201).json(config);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Invalid cron expression' });
  }
});

router.get('/schedules', (req, res) => {
  res.json(listSchedules());
});

router.delete('/schedules/:id', (req, res) => {
  deleteSchedule(req.params.id);
  res.json({ success: true, message: 'Schedule deleted' });
});

router.put('/schedules/:id/toggle', (req, res) => {
  const { enabled } = req.body;
  const item = toggleSchedule(req.params.id, Boolean(enabled));
  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ error: 'Schedule not found' });
  }
});

// Webhook routes
router.post('/webhooks', (req, res) => {
  const { name, url, events, secret, enabled } = req.body;
  if (!name || !url || !events || !Array.isArray(events)) {
    res.status(400).json({ error: 'Missing webhook name, url, or event subscriptions' });
    return;
  }
  try {
    const id = `webhook_${Date.now()}`;
    const item = registerWebhook({
      id,
      name,
      url,
      events,
      secret,
      enabled: enabled !== false
    });
    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/webhooks', (req, res) => {
  res.json(listWebhooks());
});

router.delete('/webhooks/:id', (req, res) => {
  const success = removeWebhook(req.params.id);
  if (success) {
    res.json({ success: true, message: 'Webhook registered listener deleted' });
  } else {
    res.status(404).json({ error: 'Webhook not found' });
  }
});

router.put('/webhooks/:id/toggle', (req, res) => {
  const { enabled } = req.body;
  const item = toggleWebhook(req.params.id, Boolean(enabled));
  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ error: 'Webhook not found' });
  }
});

// ================= GITHUB REPOSITORY SYNC & AUTOMATED DEPLOYMENT ENDPOINTS =================

interface GitHubConfig {
  linked: boolean;
  repoUrl: string;
  branch: string;
  autoDeploy: boolean;
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'failed';
  syncLogs: string[];
}

export default router;
