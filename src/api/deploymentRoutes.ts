import { Router, Request, Response } from 'express';
import { DeploymentManager } from './deployment.js';
import { requireRole } from './authRoutes.js';

const router = Router();

router.post('/deploy', requireRole(['editor', 'owner']), async (req: Request, res: Response) => {
  try {
    const { graphId, graphName, provider, config } = req.body;
    if (!graphId || !graphName || !provider || !config) {
      res.status(400).json({ error: "Parameters graphId, graphName, provider, and config are required." });
      return;
    }
    const tenantId = (req as any).workspaceId || 'default-workspace';
    const deployment = await DeploymentManager.startDeployment(graphId, graphName, provider, config, tenantId);
    res.json(deployment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/deploy/list', async (req: Request, res: Response) => {
  try {
    const graphId = req.query.graphId as string;
    const tenantId = (req as any).workspaceId || 'default-workspace';
    const deployments = await DeploymentManager.getDeployments(graphId, tenantId);
    res.json(deployments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/deploy/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).workspaceId || 'default-workspace';
    const dep = await DeploymentManager.getDeploymentById(id, tenantId);
    if (!dep) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    const status = await DeploymentManager.getStatus(id);
    res.json({ id, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/deploy/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).workspaceId || 'default-workspace';
    const dep = await DeploymentManager.getDeploymentById(id, tenantId);
    if (!dep) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    const logs = await DeploymentManager.getLogs(id);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/deploy/:id', requireRole(['editor', 'owner']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).workspaceId || 'default-workspace';
    const dep = await DeploymentManager.getDeploymentById(id, tenantId);
    if (!dep) {
      res.status(404).json({ error: "Deployment not found" });
      return;
    }
    const success = await DeploymentManager.stopDeployment(id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
