import { DockerSandbox } from '../services/sandbox/DockerSandbox.js';
import { IsolatedVmSandbox } from '../services/sandbox/IsolatedVmSandbox.js';

export interface CodeNodeResult {
  success: boolean;
  result?: any;
  logs: string[];
  error?: string;
}

/**
 * Runs JavaScript user code in a strictly isolated sandbox using IsolatedVm
 * (or Docker if configured via SANDBOX_MODE=docker).
 */
export async function executeCodeInSandbox(code: string, timeoutMs: number = 5000): Promise<CodeNodeResult> {
  const sandboxMode = process.env.SANDBOX_MODE;

  if (sandboxMode === 'docker') {
    const sandbox = new DockerSandbox();
    try {
      const res = await sandbox.execute(code, 'javascript', timeoutMs);
      return {
        success: res.success,
        result: res.result,
        logs: res.logs,
        error: res.error
      };
    } catch (err: any) {
      return {
        success: false,
        logs: [],
        error: err.message || String(err)
      };
    }
  } else {
    try {
      const res = await IsolatedVmSandbox.execute(code, timeoutMs);
      return {
        success: res.success,
        result: res.result,
        logs: res.logs,
        error: res.error
      };
    } catch (err: any) {
      return {
        success: false,
        logs: [],
        error: err.message || String(err)
      };
    }
  }
}
