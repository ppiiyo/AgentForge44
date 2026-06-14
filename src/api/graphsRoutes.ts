import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { VersionManager } from './metricsAndVersions.js';
import { activeRooms, getPresenceHistory } from './collaboration.js';

const router = Router();
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

router.post('/graphs', async (req: Request, res: Response) => {
  try {
    const { id, name, nodes, connections } = req.body;
    const projName = id || name || "untitled_graph";
    const safeName = projName.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || "untitled_graph";
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    const payload = {
      id: safeName,
      name: safeName,
      nodes: nodes || [],
      connections: connections || [],
      savedAt: new Date().toISOString()
    };
    await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    res.status(201).json({ success: true, id: safeName, name: safeName, nodes, connections });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/graphs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const safeName = id.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      const raw = await fsPromises.readFile(filePath, 'utf-8');
      const content = JSON.parse(raw);
      res.json({
        id: safeName,
        name: content.name || safeName,
        nodes: content.nodes || [],
        connections: content.connections || []
      });
    } else {
      res.status(404).json({ error: "Graph not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/graphs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, nodes, connections } = req.body;
    const safeName = id.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      const payload = {
        id: safeName,
        name: name || safeName,
        nodes: nodes || [],
        connections: connections || [],
        savedAt: new Date().toISOString()
      };
      await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      res.json({ success: true, id: safeName, name: name || safeName, nodes, connections });
    } else {
      res.status(404).json({ error: "Graph not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/graphs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const safeName = id.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
      res.json({ success: true, message: `Graph ${safeName} has been deleted.` });
    } else {
      res.status(404).json({ error: "Graph not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/graphs/:id/versions', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, author, snapshot } = req.body;
    if (!snapshot) {
      res.status(400).json({ error: "Missing required workflow snapshot state to commit." });
      return;
    }
    const newVer = VersionManager.commit(id, message, author, snapshot);
    res.json(newVer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/graphs/:id/versions', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versions = VersionManager.getVersions(id);
    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/graphs/:id/rollback/:versionId', (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;
    const restored = VersionManager.rollback(id, versionId);
    res.json({ success: true, restored });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/graphs/:id/diff', (req: Request, res: Response) => {
  try {
    const v1 = req.query.v1 as string;
    const v2 = req.query.v2 as string;
    if (!v1 || !v2) {
      res.status(400).json({ error: "Query parameters v1 and v2 are required for diff operation." });
      return;
    }
    const difference = VersionManager.computeDiff(v1, v2);
    res.json(difference);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/graphs/:id/presence', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const online = activeRooms[id] ? Object.values(activeRooms[id]) : [];
    const history = getPresenceHistory(id);
    res.json({ online, history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
