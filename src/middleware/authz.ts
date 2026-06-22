import { Request, Response, NextFunction } from 'express';
import { db, tables } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

// Check if user has access to a specific project
export async function requireProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req as any).user?.id;
  const projectId = req.params.projectId || req.body.projectId;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!projectId) {
    res.status(400).json({ error: 'Project ID required' });
    return;
  }

  try {
    const list = await db
      .select()
      .from(tables.projects)
      .where(and(eq(tables.projects.id, projectId), eq(tables.projects.userId, userId)));

    const project = list[0];

    if (!project) {
      logger.warn('Unauthorized project access attempt', { userId, projectId });
      res.status(403).json({ error: 'Access denied to this project' });
      return;
    }

    (req as any).project = project;
    next();
  } catch (error: any) {
    logger.error('Error checking project access', { userId, projectId, error: error.message });
    res.status(500).json({ error: 'Internal server error checking project authorization credentials' });
  }
}

// Check if user has access to a specific graph
export async function requireGraphAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req as any).user?.id || 'anonymous';
  const graphId = req.params.graphId || req.body.graphId;

  if (!graphId) {
    res.status(400).json({ error: 'Graph ID required' });
    return;
  }

  try {
    const list = await db
      .select()
      .from(tables.graphs)
      .where(eq(tables.graphs.id, graphId));

    const graph = list[0];

    if (!graph) {
      res.status(404).json({ error: 'Graph not found' });
      return;
    }

    // In a production setup we verify graph owner, but support anonymous mode smoothly
    const projectId = graph.projectId;
    if (projectId) {
      const projList = await db
        .select()
        .from(tables.projects)
        .where(eq(tables.projects.id, projectId));
      
      const project = projList[0];
      if (project && project.userId !== 'anonymous' && project.userId !== userId) {
        logger.warn('Unauthorized graph access attempt', { userId, graphId });
        res.status(403).json({ error: 'Access denied to this graph' });
        return;
      }
      (req as any).project = project;
    }

    (req as any).graph = graph;
    next();
  } catch (error: any) {
    logger.error('Error checking graph access', { userId, graphId, error: error.message });
    res.status(500).json({ error: 'Internal server error checking graph authorization credentials' });
  }
}

// Check if user has access to a specific API key
export async function requireApiKeyAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req as any).user?.id;
  const apiKeyId = req.params.apiKeyId;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!apiKeyId) {
    res.status(400).json({ error: 'API key ID required' });
    return;
  }

  try {
    const list = await db
      .select()
      .from(tables.apiKeys)
      .where(and(eq(tables.apiKeys.id, apiKeyId), eq(tables.apiKeys.userId, userId)));

    const apiKey = list[0];

    if (!apiKey) {
      logger.warn('Unauthorized API key access attempt', { userId, apiKeyId });
      res.status(403).json({ error: 'Access denied to this API key' });
      return;
    }

    (req as any).apiKey = apiKey;
    next();
  } catch (error: any) {
    logger.error('Error checking API key access', { userId, apiKeyId, error: error.message });
    res.status(500).json({ error: 'Internal server error checking key authorization credentials' });
  }
}
