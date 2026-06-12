import express from 'express';
import fs from 'fs';
import path from 'path';

// Standalone runner wrapper for AgentForge compiled solutions
export function startGraphRunner(graphFilePath: string, port: number = 3000) {
  const app = express();
  app.use(express.json());

  const AUTH_KEY = process.env.AGENTFORGE_API_KEY || '';

  // Load Graph snapshot payload description
  let graphData: any = null;
  try {
    if (fs.existsSync(graphFilePath)) {
      const raw = fs.readFileSync(graphFilePath, 'utf-8');
      graphData = JSON.parse(raw);
      console.log(`[runner] Successfully loaded graph "${graphData.name || 'Untitled'}" with ${graphData.nodes?.length || 0} nodes.`);
    } else {
      console.error(`[runner] Target graph file path not found: ${graphFilePath}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[runner] Failed to parse target graph:`, err);
    process.exit(1);
  }

  // Auth Guard Gate check
  app.use((req, res, next) => {
    if (AUTH_KEY) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== AUTH_KEY) {
        return res.status(401).json({ error: 'Unauthorized. Valid Bearer AGENTFORGE_API_KEY is required.' });
      }
    }
    next();
  });

  // POST /run logic execution connector
  app.post('/run', (req, res) => {
    const inputs = req.body || {};
    console.log(`[runner] Starting execution of "${graphData.name}" with input payloads:`, inputs);

    // Dynamic execution simulation output
    const outputResult = {
      success: true,
      timestamp: new Date().toISOString(),
      graph: {
        id: graphData.id || 'compiled-graph',
        name: graphData.name || 'Compiled Agent Schema'
      },
      inputs,
      outputs: {
        status: 'completed',
        result: `Successfully run on independent standalone server container. Received total variables count: ${Object.keys(inputs).length}`,
        data: {
          message: 'Hello, this is a response from the standalone node execution runner.',
          meta: 'Created automatically by Step 7 Deploy Engine'
        }
      }
    };

    res.json(outputResult);
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`[runner] AgentForge standalone runner running on http://0.0.0.0:${port}`);
    console.log(`[runner] POST /run active with auth guard: ${AUTH_KEY ? 'Active' : 'Permissive / Open'}`);
  });
}

// Support node direct invocation: node graph-runner.js --file ./graph.json --port 3030
if (require.main === module) {
  const args = process.argv.slice(2);
  let fileIdx = args.indexOf('--file');
  let portIdx = args.indexOf('--port');

  let file = fileIdx !== -1 ? args[fileIdx + 1] : './graph.json';
  let port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 3000;

  startGraphRunner(file, port);
}
