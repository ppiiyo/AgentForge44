import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { CodeGenerator } from './codeGenerator.js';

const router = Router();
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

router.get('/projects', async (req: Request, res: Response) => {
  try {
    const files = await fsPromises.readdir(PROJECTS_DIR);
    const projectsList = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(PROJECTS_DIR, file);
          const raw = await fsPromises.readFile(filePath, 'utf-8');
          const content = JSON.parse(raw);
          const stats = await fsPromises.stat(filePath);
          projectsList.push({
            id: file.replace('.json', ''),
            name: content.name || file.replace('.json', ''),
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
            nodes: content.nodes || [],
            connections: content.connections || []
          });
        } catch {}
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
    const filePath = path.join(PROJECTS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
      res.json({ success: true, message: `Project ${safeName} has been deleted.` });
    } else {
      res.status(404).json({ error: "Project not found" });
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
