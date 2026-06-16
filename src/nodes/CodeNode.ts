import { Worker } from 'worker_threads';

export interface CodeNodeResult {
  success: boolean;
  result?: any;
  logs: string[];
  error?: string;
}

/**
 * Runs JavaScript user code in a strictly isolated sandbox with:
 * - max 64MB memory limit via Node Worker resourceLimits
 * - max 5s execution timeout via worker termination on timeout
 * - blocked process, require, fs, child_process using vm2 VM inside the worker
 */
export async function executeCodeInSandbox(code: string, timeoutMs: number = 5000): Promise<CodeNodeResult> {
  return new Promise((resolve) => {
    // Generate worker string dynamically
    const workerCode = `
      const { parentPort, workerData } = require('worker_threads');
      const { VM } = require('vm2');

      try {
        const { code } = workerData;
        const logs = [];

        const vmInstance = new VM({
          timeout: ${timeoutMs},
          // default VM blocks process, require, fs, child_process
          sandbox: {
            console: {
              log: (...args) => {
                logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
              },
              error: (...args) => {
                logs.push("[ERROR] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
              }
            }
          }
        });

        const wrappedCode = \`(() => {
          \${code}
        })()\`;

        const result = vmInstance.run(wrappedCode);
        parentPort.postMessage({ success: true, result, logs });
      } catch (err) {
        parentPort.postMessage({ success: false, error: err.message || String(err), logs: [] });
      }
    `;

    const worker = new Worker(workerCode, {
      eval: true,
      workerData: { code },
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16
      }
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({
        success: false,
        logs: ["[SYSTEM ERROR] Sandbox execution timed out after 5 seconds."],
        error: "Execution Timeout Exceeded"
      });
    }, timeoutMs);

    worker.on('message', (message: any) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({
        success: message.success,
        result: message.result,
        logs: message.logs || [],
        error: message.error
      });
    });

    worker.on('error', (err: any) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({
        success: false,
        logs: [],
        error: err.message || "Sandbox memory / resource allocation limit exceeded"
      });
    });

    worker.on('exit', () => {
      clearTimeout(timeout);
    });
  });
}
