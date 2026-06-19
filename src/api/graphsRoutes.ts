import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { VersionManager } from './metricsAndVersions.js';
import { activeRooms, getPresenceHistory } from './collaboration.js';
import { validateBody, GraphSaveSchema } from '../utils/validation.js';

const router = Router();
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

/**
 * @swagger
 * /api/graphs:
 *   post:
 *     summary: Save a new graph setup
 *     description: Save a new agent flow graph configuration to persistence.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 example: my-visual-agent
 *               name:
 *                 type: string
 *                 example: My Visual Agent
 *               nodes:
 *                 type: array
 *                 items:
 *                   type: object
 *               connections:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Graph configuration saved successfully.
 *       400:
 *         description: Validation payload error.
 *       401:
 *         description: Unauthorized.
 */
/**
 * Save a new graph
 * @param req.body Graph data
 * @returns Saved graph with ID
 * @throws 400 if validation fails
 * @throws 401 if not authenticated
 */
router.post('/graphs', validateBody(GraphSaveSchema), async (req: Request, res: Response) => {
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

/**
 * @swagger
 * /api/graphs/{id}:
 *   get:
 *     summary: Retrieve a single graph configuration by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: my-visual-agent
 *     responses:
 *       200:
 *         description: Successfully fetched graph config.
 *       404:
 *         description: Graph not found.
 */
/**
 * Get graph by ID
 * @param req.params.id Unique graph identifier
 * @returns Graph details
 * @throws 404 if graph does not exist
 */
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

/**
 * @swagger
 * /api/graphs/{id}:
 *   put:
 *     summary: Update an existing graph configuration
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               nodes:
 *                 type: array
 *                 items:
 *                   type: object
 *               connections:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Graph successfully modified.
 *       404:
 *         description: Target graph not found.
 */
/**
 * Update graph config
 * @param req.params.id Unique graph identifier
 * @param req.body Updated graph details
 * @returns Updated graph structure
 */
router.put('/graphs/:id', validateBody(GraphSaveSchema), async (req: Request, res: Response) => {
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

/**
 * @swagger
 * /api/graphs/{id}:
 *   delete:
 *     summary: Delete a saved graph schema
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Graph permanently erased.
 *       404:
 *         description: Graph target not found.
 */
/**
 * Remove specified graph definition
 * @param req.params.id Unique graph identifier
 * @returns Deletion status confirmation
 */
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

/**
 * @swagger
 * /api/graphs/{id}/versions:
 *   post:
 *     summary: Create a version commit snapshot checkpoint
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - snapshot
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Added sub-agents"
 *               author:
 *                 type: string
 *                 example: "admin"
 *               snapshot:
 *                 type: object
 *     responses:
 *       200:
 *         description: Checkpoint version snapshot registered.
 *       400:
 *         description: Missing mandatory snapshot payload.
 */
/**
 * Commit version snapshot
 * @param req.params.id Unique graph identifier
 * @param req.body Checkout structure
 * @returns Version log descriptor
 */
router.post('/graphs/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, author, snapshot } = req.body;
    if (!snapshot) {
      res.status(400).json({ error: "Missing required workflow snapshot state to commit." });
      return;
    }
    const result = VersionManager.commit(id, message, author, snapshot);
    const newVer = result instanceof Promise ? await result : result;
    res.json(newVer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/graphs/{id}/versions:
 *   get:
 *     summary: List all version rollback snapshots of a graph
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of version headers returned successfully.
 */
/**
 * Get all versions list
 * @param req.params.id Unique graph identifier
 * @returns History trace of versions
 */
router.get('/graphs/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = VersionManager.getVersions(id);
    const versions = result instanceof Promise ? await result : result;
    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/graphs/{id}/rollback/{versionId}:
 *   post:
 *     summary: Rollback active graph context to a specific version block ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Graph rolled back successfully.
 */
/**
 * Rollback graph rollback to older index
 * @param req.params.id Unique graph identifier
 * @param req.params.versionId Specific version ID string
 * @returns Reverted workflow node payload
 */
router.post('/graphs/:id/rollback/:versionId', async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;
    const result = VersionManager.rollback(id, versionId);
    const restored = result instanceof Promise ? await result : result;
    res.json({ success: true, restored });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/graphs/{id}/diff:
 *   get:
 *     summary: Compare differences between two version ID references
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: v1
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: v2
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of added, modified, deleted vertices/links.
 */
/**
 * Compute differences delta
 * @param req.params.id Unique graph identifier
 * @param req.query.v1 First version ID
 * @param req.query.v2 Second version ID
 * @returns Delta object diff descriptor list
 */
router.get('/graphs/:id/diff', async (req: Request, res: Response) => {
  try {
    const v1 = req.query.v1 as string;
    const v2 = req.query.v2 as string;
    if (!v1 || !v2) {
      res.status(400).json({ error: "Query parameters v1 and v2 are required for diff operation." });
      return;
    }
    const result = VersionManager.computeDiff(v1, v2);
    const difference = result instanceof Promise ? await result : result;
    res.json(difference);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/graphs/{id}/presence:
 *   get:
 *     summary: Retrieve collaboration sync presences
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Presence peer listing and history.
 */
/**
 * Fetch collaborative presences list
 * @param req.params.id Unique graph identifier
 * @returns Online user list and movement timelines
 */
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
