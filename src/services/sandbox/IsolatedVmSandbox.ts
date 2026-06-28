import ivm from 'isolated-vm';

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
    memoryLimitMb: number = 32
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    let isolate: ivm.Isolate | null = null;
    let context: ivm.Context | null = null;
    let logCallback: ivm.Callback | null = null;

    try {
      // Memory limit (e.g., 32MB) to prevent OOM attacks
      isolate = new ivm.Isolate({ memoryLimit: memoryLimitMb });
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

      // Inject secure sandbox-only console implementation
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

      return {
        success: true,
        result: finalResult,
        logs,
        executionTime: Date.now() - startTime,
        isolationLevel: 'IsolatedVm'
      };
    } catch (err: any) {
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
