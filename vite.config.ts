/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: 'AgentForge Studio',
          short_name: 'AgentForge',
          description: 'The Ultimate Visual AI Agent Orchestrator Studio',
          theme_color: '#111827',
          background_color: '#111827',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          icons: [
            {
              src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f525.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f525.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any masked'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                }
              }
            },
            {
              urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'twemoji-assets-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ]
        }
      }),
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
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
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
          statements: 80,
          branches: 75,
        }
      }
    },
  };
});
