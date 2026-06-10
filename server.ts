import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { executePipeline } from './src/api/agentRun';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Main API execution route
app.post('/api/run-pipeline', async (req: express.Request, res: express.Response) => {
  try {
    const { nodes, connections } = req.body;
    if (!nodes || !connections) {
      res.status(400).json({ error: "Missing nodes or connections payload." });
      return;
    }
    const result = await executePipeline(nodes, connections);
    res.json(result);
  } catch (err: any) {
    console.error("Pipeline run failure:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite server to build only in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });
}

setupServer().catch(err => {
  console.error("Failed to start server:", err);
});
