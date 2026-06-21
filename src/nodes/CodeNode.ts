import { DockerSandbox } from '../services/sandbox/DockerSandbox.js';

export interface CodeNodeResult {
  success: boolean;
  result?: any;
  logs: string[];
  error?: string;
}

/**
 * Runs JavaScript user code in a strictly isolated sandbox using Docker Sandbox
 * or safe isolated subprocess structures.
 */
export async function executeCodeInSandbox(code: string, timeoutMs: number = 5000): Promise<CodeNodeResult> {
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
}
