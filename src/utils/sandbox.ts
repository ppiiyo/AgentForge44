import ivm from 'isolated-vm';

export interface SandboxResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
}

export class SecureSandbox {
  private isolate: ivm.Isolate;
  private context: ivm.Context;
  
  constructor(private memoryLimit: number = 128) {
    this.isolate = new ivm.Isolate({ memoryLimit: this.memoryLimit });
    this.context = this.isolate.createContextSync();
  }

  async execute(code: string, timeout: number = 5000): Promise<SandboxResult> {
    const startTime = Date.now();
    
    try {
      const jail = this.context.global;
      jail.setSync('global', jail.derefInto());
      
      // Safe api log callback
      const logCallback = new ivm.Callback((msg: string) => {
        console.log('[Sandbox]', msg);
      });
      jail.setSync('log', logCallback);

      // Safe fetch callback with whitelist check
      const fetchCallback = new ivm.Callback((url: string, options?: any) => {
        try {
          const allowedDomains = ['api.openai.com', 'api.anthropic.com', 'api.openai.com', 'api.google.com', 'api.cohere.com', 'localhost'];
          const urlObj = new URL(url);
          if (!allowedDomains.some(d => urlObj.hostname.includes(d))) {
            throw new Error('Domain not allowed');
          }
          // Simple mock / fetch logic
          return `{"status": "success", "message": "Simulated sandbox fetch to ${url}"}`;
        } catch (e: any) {
          return `{"status": "error", "message": "${e.message}"}`;
        }
      });
      jail.setSync('fetch', fetchCallback);
      
      const script = this.isolate.compileScriptSync(code);
      const resultObj = await script.run(this.context, { timeout });
      
      let finalOutput: any;
      if (resultObj) {
        if (typeof resultObj === 'object' && typeof resultObj.copy === 'function') {
          try {
            finalOutput = resultObj.copySync();
          } catch {
            finalOutput = String(resultObj);
          }
        } else {
          finalOutput = resultObj;
        }
      }

      return {
        success: true,
        output: finalOutput,
        executionTime: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  dispose() {
    try {
      this.context.release();
    } catch (err: any) {
      console.warn("Isolated VM context release warning:", err.message);
    }
    try {
      this.isolate.dispose();
    } catch (err: any) {
      console.warn("Isolated VM isolate dispose warning:", err.message);
    }
  }
}

// Singleton pool for reuse
const sandboxPool = new Map<string, SecureSandbox>();

export function getSandbox(runId: string): SecureSandbox {
  if (!sandboxPool.has(runId)) {
    sandboxPool.set(runId, new SecureSandbox());
  }
  return sandboxPool.get(runId)!;
}

export function releaseSandbox(runId: string) {
  const sandbox = sandboxPool.get(runId);
  if (sandbox) {
    sandbox.dispose();
    sandboxPool.delete(runId);
  }
}
