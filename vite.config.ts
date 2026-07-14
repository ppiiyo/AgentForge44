/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-server-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/run-pipeline' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const { nodes, connections } = JSON.parse(body);
                  const { executePipeline } = await import('./src/api/agentRun.js');
                  const result = await executePipeline(nodes, connections);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(result));
                } catch (err: any) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message || String(err) }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.ts'],
      testTimeout: 30000,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.spec.ts',
        '**/.{idea,git,cache,output,temp}**'
      ],
      fileParallelism: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/**',
          'dist/**',
          'src/scheduler/**',
          'src/webhooks/**',
          'src/utils/importer.ts',
          'src/utils/markdownExporter.ts',
          'src/utils/debugSessions.ts',
          'src/api/copilot.ts',
          'src/api/deployment.ts',
          'src/api/deploymentRoutes.ts',
          'src/api/ragRoutes.ts',
          'src/api/metricsRoutes.ts',
          'src/api/userAuth.ts',
          'src/api/mcpRoutes.ts',
          'src/api/patternsRoutes.ts',
          'src/api/projectsRoutes.ts',
          'src/api/analyticsAndWebhooks.ts',
          '**/*.test.ts',
          '**/*.spec.ts',
          'playwright.config.ts',
          'vite-env.d.ts',
          'server.ts'
        ],
        thresholds: {
          lines: 75,
          branches: 70,
          functions: 75,
          statements: 75,
        }
      }
    },
  };
});
