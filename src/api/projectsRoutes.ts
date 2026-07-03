import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { CodeGenerator } from './codeGenerator.js';
import { db, tables } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateBody, GraphSaveSchema } from '../utils/validation.js';
import { requireRole } from './authRoutes.js';
import { logger } from '../utils/logger.js';

const router = Router();
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Helper to check ownership of a project under the active workspace
async function checkProjectOwnership(projectId: string, tenantId: string): Promise<{ allowed: boolean; exists: boolean }> {
  const projectList = await db.select().from(tables.projects).where(eq(tables.projects.id, projectId));
  const project = projectList[0];
  if (!project) {
    return { allowed: true, exists: false };
  }
  return { allowed: project.tenantId === tenantId, exists: true };
}

router.get('/projects', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const workspaceId = (req as any).workspaceId || 'default-workspace';

    // 1. Fetch workspace projects
    const userProjects = await db.select().from(tables.projects).where(eq(tables.projects.tenantId, workspaceId));
    const userProjectIds = new Set(userProjects.map(p => p.id));

    // 2. Fetch workspace active graphs from SQLite / Postgres database
    let dbGraphs: any[] = [];
    try {
      dbGraphs = await db.select().from(tables.graphs).where(eq(tables.graphs.tenantId, workspaceId));
    } catch (dbErr: any) {
      console.warn("Database select failed, falling back purely to filesystem:", dbErr.message);
    }

    const projectsList: any[] = [];
    const dbGraphIds = new Set(dbGraphs.map(g => g.id));

    // 3. Read local filesystem directory
    let files: string[] = [];
    try {
      files = await fsPromises.readdir(PROJECTS_DIR);
    } catch (fsErr: any) {
      console.warn("Failed to read local filesystem projects directory:", fsErr.message);
    }

    // 4. Process database-saved graphs first
    for (const row of dbGraphs) {
      try {
        projectsList.push({
          id: row.id,
          name: row.name,
          createdAt: row.createdAt,
          updatedAt: row.createdAt,
          nodes: typeof row.nodes === 'string' ? JSON.parse(row.nodes) : row.nodes,
          connections: typeof row.connections === 'string' ? JSON.parse(row.connections) : row.connections
        });
      } catch (parseErr: any) {
        console.warn(`Failed to parse graph row for "${row.id}":`, parseErr.message);
      }
    }

    // 5. Auto-seeding migration: Check if files contain older graphs not yet migrated to active DB
    for (const file of files) {
      if (file.endsWith('.json')) {
        const fileId = file.replace('.json', '');
        
        // Security check: Check if project is already registered by another workspace
        const ownership = await checkProjectOwnership(fileId, workspaceId);
        if (ownership.exists && !ownership.allowed) {
          // Belongs to another workspace, exclude completely!
          continue;
        }

        if (!dbGraphIds.has(fileId)) {
          try {
            const filePath = path.join(PROJECTS_DIR, file);
            const raw = await fsPromises.readFile(filePath, 'utf-8');
            const content = JSON.parse(raw);
            const stats = await fsPromises.stat(filePath);

            const record = {
              id: fileId,
              name: content.name || fileId,
              createdAt: stats.birthtime.toISOString(),
              nodes: content.nodes || [],
              connections: content.connections || []
            };

            // Auto-create project ownership in database with race-condition safety
            if (!ownership.exists) {
              try {
                const existingProj = await db.select().from(tables.projects).where(eq(tables.projects.id, fileId));
                if (existingProj.length === 0) {
                  await db.insert(tables.projects).values({
                    id: fileId,
                    name: content.name || fileId,
                    userId: userId,
                    tenantId: workspaceId,
                    createdAt: record.createdAt,
                    updatedAt: stats.mtime.toISOString()
                  });
                }
                userProjectIds.add(fileId);
              } catch (projErr: any) {
                logger.warn(`[Self-Heal] Project auto-creation skipped or already exists for "${fileId}": ${projErr.message}`);
                // Ensure it is marked in the set if it exists or was handled
                userProjectIds.add(fileId);
              }
            }

            // Non-blocking auto-seeding into database
            try {
              const existingRecord = await db.select().from(tables.graphs).where(eq(tables.graphs.id, record.id));
              if (existingRecord.length === 0) {
                await db.insert(tables.graphs).values({
                  id: record.id,
                  projectId: fileId,
                  name: record.name,
                  nodes: JSON.stringify(record.nodes),
                  connections: JSON.stringify(record.connections),
                  tenantId: workspaceId,
                  createdAt: record.createdAt
                });
                logger.info(`[Self-Heal] Auto-seeded filesystem graph "${record.id}" for workspace "${workspaceId}"`);
              }
            } catch (seedErr: any) {
              logger.warn(`[Self-Heal] Auto-seeding failed for "${record.id}": ${seedErr.message}`);
            }

            projectsList.push({
              id: record.id,
              name: record.name,
              createdAt: stats.birthtime,
              updatedAt: stats.mtime,
              nodes: record.nodes,
              connections: record.connections
            });
          } catch (fileErr: any) {
            console.warn(`Failed to auto-seed local project file "${file}":`, fileErr.message);
          }
        }
      }
    }

    res.json(projectsList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects', requireRole(['editor', 'owner']), validateBody(GraphSaveSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { name, id, nodes, connections } = req.body;
    const resolvedName = name || id;
    if (!resolvedName || typeof resolvedName !== 'string') {
      res.status(400).json({ error: "Valid project name is required" });
      return;
    }
    const safeName = resolvedName.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || "untitled_project";

    const workspaceId = (req as any).workspaceId || 'default-workspace';

    // Security check: Check if project is owned by another workspace
    const ownership = await checkProjectOwnership(safeName, workspaceId);
    if (ownership.exists && !ownership.allowed) {
      res.status(403).json({ error: "Access denied to this project" });
      return;
    }

    // 1. Create or update project record in DB
    if (!ownership.exists) {
      await db.insert(tables.projects).values({
        id: safeName,
        name: safeName,
        userId: userId,
        tenantId: workspaceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      await db.update(tables.projects).set({
        updatedAt: new Date().toISOString()
      }).where(and(eq(tables.projects.id, safeName), eq(tables.projects.tenantId, workspaceId)));
    }

    // 2. Write metadata configurations to active DB
    try {
      const existing = await db.select().from(tables.graphs).where(and(eq(tables.graphs.id, safeName), eq(tables.graphs.tenantId, workspaceId)));
      if (existing.length > 0) {
        await db.update(tables.graphs).set({
          name: safeName,
          projectId: safeName,
          nodes: JSON.stringify(nodes || []),
          connections: JSON.stringify(connections || [])
        }).where(and(eq(tables.graphs.id, safeName), eq(tables.graphs.tenantId, workspaceId)));
      } else {
        await db.insert(tables.graphs).values({
          id: safeName,
          projectId: safeName,
          name: safeName,
          nodes: JSON.stringify(nodes || []),
          connections: JSON.stringify(connections || []),
          tenantId: workspaceId,
          createdAt: new Date().toISOString()
        });
      }
    } catch (dbErr: any) {
      console.warn("Database storage failed, falling back only to filesystem write:", dbErr.message);
    }

    // 3. Dual-Write to disk layout for persistent backup (non-blocking for stateless/ephemeral runtimes)
    try {
      const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
      const payload = {
        name: safeName,
        nodes: nodes || [],
        connections: connections || [],
        savedAt: new Date().toISOString()
      };
      await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (fsErr: any) {
      console.warn(`[Stateless FS] Failed to write local filesystem backup for "${safeName}":`, fsErr.message);
    }

    res.json({ success: true, name: safeName, message: "Project saved successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/projects/:name', requireRole(['editor', 'owner']), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { name } = req.params;
    const safeName = name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();

    const workspaceId = (req as any).workspaceId || 'default-workspace';

    // Security check: Check if project is owned by another workspace
    const ownership = await checkProjectOwnership(safeName, workspaceId);
    if (ownership.exists && !ownership.allowed) {
      res.status(403).json({ error: "Access denied to this project" });
      return;
    }

    // 1. Delete from projects and graphs tables
    try {
      await db.delete(tables.projects).where(and(eq(tables.projects.id, safeName), eq(tables.projects.tenantId, workspaceId)));
      await db.delete(tables.graphs).where(and(eq(tables.graphs.id, safeName), eq(tables.graphs.tenantId, workspaceId)));
    } catch (dbErr: any) {
      console.warn("Database deletion failed, proceeding with filesystem removal:", dbErr.message);
    }

    // 2. Delete file (non-blocking for stateless/ephemeral runtimes)
    try {
      const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
      }
    } catch (fsErr: any) {
      console.warn(`[Stateless FS] Failed to unlink local filesystem backup for "${safeName}":`, fsErr.message);
    }

    res.json({ success: true, message: `Project ${safeName} has been deleted successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects/export', (req: Request, res: Response) => {
  try {
    const { nodes, connections, language } = req.body;
    if (!nodes || !connections) {
      res.status(400).json({ error: "Missing required workflow nodes and connections." });
      return;
    }
    const targetLang = language === 'python' ? 'python' : 'typescript';
    let codeStr = "";
    if (targetLang === 'python') {
      codeStr = CodeGenerator.generatePython(nodes, connections);
    } else {
      codeStr = CodeGenerator.generateTypeScript(nodes, connections);
    }
    res.json({ success: true, language: targetLang, code: codeStr });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
