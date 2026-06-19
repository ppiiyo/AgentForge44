import ivm from 'isolated-vm';

export interface CodeNodeResult {
  success: boolean;
  result?: any;
  logs: string[];
  error?: string;
}

/**
 * Runs JavaScript user code in a strictly isolated sandbox with:
 * - max 64MB memory limit via isolated-vm Isolate heap
 * - max 5s execution timeout via isolated-vm compile/run execution timeout
 * - blocked process, require, fs, child_process by running inside a fresh V8 Isolate
 */
export async function executeCodeInSandbox(code: string, timeoutMs: number = 5000): Promise<CodeNodeResult> {
  const logs: string[] = [];
  
  try {
    const isolate = new ivm.Isolate({ memoryLimit: 64 });
    const context = await isolate.createContext();
    const jail = context.global;
    
    await jail.set('global', jail.derefInto());

    const logCallback = new ivm.Callback((...args: any[]) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
    });
    
    const errorCallback = new ivm.Callback((...args: any[]) => {
      logs.push("[ERROR] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
    });

    await context.evalClosure(
      `
      global.console = {
        log: (...args) => {
          $0.apply(undefined, args);
        },
        error: (...args) => {
          $1.apply(undefined, args);
        }
      };
      `,
      [logCallback, errorCallback],
      { arguments: { copy: true } }
    );

    // Wrap the code to capture returns correctly
    const wrappedCode = `(() => {
      ${code}
    })()`;
    
    const script = await isolate.compileScript(wrappedCode);
    const resultRef = await script.run(context, { timeout: timeoutMs });
    
    let result: any;
    if (resultRef) {
      if (typeof resultRef === 'object' && typeof resultRef.copy === 'function') {
        try {
          result = await resultRef.copy();
        } catch {
          result = String(resultRef);
        }
      } else {
        result = resultRef;
      }
    }

    context.release();
    isolate.dispose();

    return {
      success: true,
      result,
      logs
    };
  } catch (err: any) {
    return {
      success: false,
      logs,
      error: err.message || String(err)
    };
  }
}
