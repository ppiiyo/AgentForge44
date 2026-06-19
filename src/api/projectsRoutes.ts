import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { CodeGenerator } from './codeGenerator.js';
import { db, tables } from '../db/index.js';
import { eq } from 'drizzle-orm';

const router = Router();
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

router.get('/projects', async (req: Request, res: Response) => {
  try {
    // 1. Fetch all active graphs from SQLite / Postgres database
    let dbGraphs: any[] = [];
    try {
      dbGraphs = await db.select().from(tables.graphs);
    } catch (dbErr: any) {
      console.warn("Database select failed, falling back purely to filesystem:", dbErr.message);
    }

    const projectsList: any[] = [];
    const dbGraphIds = new Set(dbGraphs.map(g => g.id));

    // 2. Read local filesystem directory
    let files: string[] = [];
    try {
      files = await fsPromises.readdir(PROJECTS_DIR);
    } catch {}

    // 3. Process database-saved graphs first
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
      } catch {}
    }

    // 4. Auto-seeding migration: Check if files contain older graphs not yet migrated to active DB
    for (const file of files) {
      if (file.endsWith('.json')) {
        const fileId = file.replace('.json', '');
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

            // Non-blocking auto-seeding into database
            try {
              await db.insert(tables.graphs).values({
                id: record.id,
                name: record.name,
                nodes: JSON.stringify(record.nodes),
                connections: JSON.stringify(record.connections),
                createdAt: record.createdAt
              });
              console.log(`[Self-Heal] Auto-seeded filesystem graph "${record.id}" to the active database successfully.`);
            } catch (seedErr: any) {
              console.warn(`[Self-Heal] Auto-seeding failed for "${record.id}":`, seedErr.message);
            }

            projectsList.push({
              id: record.id,
              name: record.name,
              createdAt: stats.birthtime,
              updatedAt: stats.mtime,
              nodes: record.nodes,
              connections: record.connections
            });
          } catch {}
        }
      }
    }

    res.json(projectsList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects', async (req: Request, res: Response) => {
  try {
    const { name, nodes, connections } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: "Valid project name is required" });
      return;
    }
    const safeName = name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || "untitled_project";

    // 1. Write metadata configurations to active DB
    try {
      const existing = await db.select().from(tables.graphs).where(eq(tables.graphs.id, safeName));
      if (existing.length > 0) {
        await db.update(tables.graphs).set({
          name: safeName,
          nodes: JSON.stringify(nodes || []),
          connections: JSON.stringify(connections || [])
        }).where(eq(tables.graphs.id, safeName));
      } else {
        await db.insert(tables.graphs).values({
          id: safeName,
          name: safeName,
          nodes: JSON.stringify(nodes || []),
          connections: JSON.stringify(connections || []),
          createdAt: new Date().toISOString()
        });
      }
    } catch (dbErr: any) {
      console.warn("Database storage failed, falling back only to filesystem write:", dbErr.message);
    }

    // 2. Dual-Write to disk layout for persistent backup
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    const payload = {
      name: safeName,
      nodes: nodes || [],
      connections: connections || [],
      savedAt: new Date().toISOString()
    };
    await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    res.json({ success: true, name: safeName, message: "Project saved successfully!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/projects/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const safeName = name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();

    // 1. Delete from database
    try {
      await db.delete(tables.graphs).where(eq(tables.graphs.id, safeName));
    } catch (dbErr: any) {
      console.warn("Database deletion failed, proceeding with filesystem removal:", dbErr.message);
    }

    // 2. Delete file
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
      res.json({ success: true, message: `Project ${safeName} has been deleted.` });
    } else {
      res.json({ success: true, message: `Completed deletion operations for ${safeName}.` });
    }
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
