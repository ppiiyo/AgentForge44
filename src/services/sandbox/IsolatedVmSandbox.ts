import ivm from 'isolated-vm';
import { sandboxMemoryGauge } from '../metrics.js';

export interface SandboxExecutionResult {
  success: boolean;
  result?: any;
  logs: string[];
  error?: string;
  executionTime: number;
  isolationLevel: 'DockerContainer' | 'IsolatedVm' | 'InVMVirtualJail';
}

export class IsolatedVmSandbox {
  /**
   * Safe execution of JavaScript inside an isolated V8 environment.
   */
  public static async execute(
    code: string,
    timeoutMs: number = 5000,
    memoryLimitMb: number = 128
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    let isolate: ivm.Isolate | null = null;
    let context: ivm.Context | null = null;
    let logCallback: ivm.Callback | null = null;

    try {
      // Impose a strict ceiling of 128MB to prevent memory-exhaustion/DoS attacks in multi-tenant contexts
      const actualMemoryLimit = Math.min(memoryLimitMb, 128);
      isolate = new ivm.Isolate({ memoryLimit: actualMemoryLimit });
      context = await isolate.createContext();

      const jail = context.global;
      // Set safe global reference
      await jail.set('global', jail.derefInto());

      // Collect logs via a safe callback
      logCallback = new ivm.Callback((...args: any[]) => {
        const line = args.map(arg => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch {
              return '[Circular / Non-serializable Object]';
            }
          }
          return String(arg);
        }).join(' ');
        logs.push(line);
      });
      await jail.set('__collectLog', logCallback);

      // Inject secure sandbox-only console implementation and require module whitelist
      const setupCode = `
        globalThis.console = {
          log: (...args) => {
            __collectLog.apply(undefined, args);
          },
          error: (...args) => {
            __collectLog.apply(undefined, args);
          },
          warn: (...args) => {
            __collectLog.apply(undefined, args);
          },
          info: (...args) => {
            __collectLog.apply(undefined, args);
          }
        };

        const mocks = {
          path: {
            join: (...args) => args.filter(Boolean).join('/'),
            resolve: (...args) => args.filter(Boolean).join('/'),
            basename: (p) => p.split('/').pop() || '',
            dirname: (p) => p.split('/').slice(0, -1).join('/') || '.',
            extname: (p) => {
              const base = p.split('/').pop() || '';
              const parts = base.split('.');
              return parts.length > 1 ? '.' + parts.pop() : '';
            }
          },
          url: {
            parse: (urlStr) => {
              try {
                const u = new URL(urlStr);
                return { href: u.href, protocol: u.protocol, host: u.host, hostname: u.hostname, port: u.port, pathname: u.pathname, search: u.search, hash: u.hash };
              } catch (e) {
                return {};
              }
            }
          },
          querystring: {
            stringify: (obj) => {
              const params = new URLSearchParams();
              for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                  params.append(key, obj[key]);
                }
              }
              return params.toString();
            },
            parse: (str) => {
              const params = new URLSearchParams(str);
              const obj = {};
              for (const [key, val] of params.entries()) {
                obj[key] = val;
              }
              return obj;
            }
          },
          util: {
            format: (...args) => args.join(' '),
            inspect: (obj) => JSON.stringify(obj)
          }
        };

        globalThis.require = (name) => {
          if (mocks.hasOwnProperty(name)) {
            return mocks[name];
          }
          throw new Error("Module '" + name + "' is not allowed in this sandbox");
        };
      `;
      const setupScript = await isolate.compileScript(setupCode);
      await setupScript.run(context);

      let userScript: ivm.Script;
      try {
        userScript = await isolate.compileScript(code);
      } catch (compileErr: any) {
        if (compileErr.message && compileErr.message.includes('Illegal return statement')) {
          const wrappedCode = `(() => {\n${code}\n})()`;
          userScript = await isolate.compileScript(wrappedCode);
        } else {
          throw compileErr;
        }
      }
      const resultVal = await userScript.run(context, { timeout: timeoutMs });

      let finalResult: any = undefined;
      if (resultVal) {
        if (typeof resultVal === 'object' && typeof resultVal.copy === 'function') {
          try {
            finalResult = resultVal.copySync();
          } catch {
            finalResult = String(resultVal);
          }
        } else {
          finalResult = resultVal;
        }
      }

      if (isolate) {
        try {
          const stats = await isolate.getHeapStatistics();
          sandboxMemoryGauge.set({ isolation_level: 'IsolatedVm', status: 'success' }, stats.used_heap_size);
        } catch {}
      }

      return {
        success: true,
        result: finalResult,
        logs,
        executionTime: Date.now() - startTime,
        isolationLevel: 'IsolatedVm'
      };
    } catch (err: any) {
      if (isolate) {
        try {
          const stats = await isolate.getHeapStatistics();
          sandboxMemoryGauge.set({ isolation_level: 'IsolatedVm', status: 'failed' }, stats.used_heap_size);
        } catch {}
      }

      return {
        success: false,
        logs,
        error: err.message || String(err),
        executionTime: Date.now() - startTime,
        isolationLevel: 'IsolatedVm'
      };
    } finally {
      if (logCallback) {
        try {
          (logCallback as any).release();
        } catch {}
      }
      if (context) {
        try {
          context.release();
        } catch {}
      }
      if (isolate) {
        try {
          isolate.dispose();
        } catch {}
      }
    }
  }
}
