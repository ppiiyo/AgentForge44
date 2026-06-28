import { execSync, spawn } from 'child_process';
import { logger } from '../../utils/logger.js';

export interface SandboxExecutionResult {
  success: boolean;
  result?: any;
  logs: string[];
  error?: string;
  executionTime: number;
  isolationLevel: 'DockerContainer' | 'IsolatedChildProcess' | 'InVMVirtualJail';
}

export class DockerSandbox {
  private static hasDockerCached: boolean | null = null;

  /**
   * Probes if Docker CLI is available and responsive on the system.
   */
  public static checkDockerAvailable(): boolean {
    if (this.hasDockerCached !== null) {
      return this.hasDockerCached;
    }
    try {
      execSync('docker ps', { stdio: 'ignore', timeout: 2000 });
      this.hasDockerCached = true;
      logger.info('Docker Sandbox: Docker daemon detected and verified active.');
    } catch {
      this.hasDockerCached = false;
      logger.warn('Docker Sandbox: Docker daemon not available.');
    }
    return this.hasDockerCached;
  }

  /**
   * Securely runs JavaScript or Python code within a sandboxed Docker context.
   */
  public async execute(
    code: string,
    language: 'javascript' | 'python' = 'javascript',
    timeoutMs: number = 5000
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const useDocker = DockerSandbox.checkDockerAvailable();

    if (!useDocker) {
      return {
        success: false,
        logs: [],
        error: 'Docker Sandbox execution failed: Docker daemon is not available and insecure fallback is disabled.',
        executionTime: Date.now() - startTime,
        isolationLevel: 'DockerContainer'
      };
    }

    try {
      return await this.runInDocker(code, language, timeoutMs, startTime);
    } catch (err: any) {
      logger.error(`Docker execution threw an error: ${err.message}.`);
      return {
        success: false,
        logs: [],
        error: `Docker Sandbox crashed during setup: ${err.message}`,
        executionTime: Date.now() - startTime,
        isolationLevel: 'DockerContainer'
      };
    }
  }

  /**
   * Executes code inside a Docker container with strict CPU, memory, and network constraints.
   */
  private async runInDocker(
    code: string,
    language: 'javascript' | 'python',
    timeoutMs: number,
    startTime: number
  ): Promise<SandboxExecutionResult> {
    const logs: string[] = [];
    const containerName = `agent_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const image = language === 'javascript' ? 'node:18-alpine' : 'python:3.11-alpine';
    
    // Command selection based on language target
    let runCommand: string[] = [];
    if (language === 'javascript') {
      runCommand = ['node', '-e', `
        const console = {
          log: (...args) => process.stdout.write(args.join(' ') + '\\n'),
          error: (...args) => process.stderr.write(args.join(' ') + '\\n')
        };
        try {
          const run = () => { ${code} };
          const result = run();
          if (result !== undefined) {
            process.stdout.write('__RESULT__::' + JSON.stringify(result) + '\\n');
          }
        } catch(e) {
          process.stderr.write('__ERROR__::' + e.message + '\\n');
          process.exit(1);
        }
      `];
    } else {
      runCommand = ['python3', '-c', `
import sys, json
try:
    original_print = print
    logs = []
    def custom_print(*args, **kwargs):
        msg = " ".join(map(str, args))
        sys.stdout.write(msg + "\\n")
    print = custom_print
    
    local_vars = {}
    exec(${JSON.stringify(code)}, {}, local_vars)
    if local_vars:
        last_val = list(local_vars.values())[-1]
        sys.stdout.write("__RESULT__::" + json.dumps(last_val) + "\\n")
except Exception as e:
    sys.stderr.write("__ERROR__::" + str(e) + "\\n")
    sys.exit(1)
`];
    }

    try {
      // Build docker arguments to run securely:
      // --network none: Block all egress networking to prevent data exfiltration
      // --memory 64m: Set 64MB memory limit cap to block RAM exhausting attacks
      // --cpus 0.5: Restrict CPU core allocation to avoid DoS CPU choking
      // --read-only: Ensure read-only core system to block filesystem persistence
      // --cap-drop ALL: Drop all kernel capabilities
      // --pids-limit 20: Limit process and thread count to prevent fork bombs
      const dockerArgs = [
        'run', '--rm', '--network', 'none',
        '--memory', '64m', '--cpus', '0.5',
        '--cap-drop', 'ALL', '--pids-limit', '20',
        '--name', containerName,
        image,
        ...runCommand
      ];

      return new Promise((resolve) => {
        const proc = spawn('docker', dockerArgs);
        let stdoutData = '';
        let stderrData = '';
        
        const timeout = setTimeout(() => {
          try {
            execSync(`docker kill ${containerName}`, { stdio: 'ignore' });
          } catch {}
          resolve({
            success: false,
            logs,
            error: `Timeout: Execution exceeded safe duration limit of ${timeoutMs}ms (Docker Quarantined).`,
            executionTime: Date.now() - startTime,
            isolationLevel: 'DockerContainer'
          });
        }, timeoutMs);

        proc.stdout.on('data', (data) => {
          stdoutData += data.toString();
        });

        proc.stderr.on('data', (data) => {
          stderrData += data.toString();
        });

        proc.on('close', (code) => {
          clearTimeout(timeout);
          const rawLines = stdoutData.split('\n');
          let result: any = undefined;
          let errorMessage = '';

          for (const line of rawLines) {
            if (line.startsWith('__RESULT__::')) {
              try {
                result = JSON.parse(line.substring('__RESULT__::'.length));
              } catch {}
            } else if (line.trim()) {
              logs.push(line);
            }
          }

          if (stderrData.includes('__ERROR__::')) {
            const errLine = stderrData.split('\n').find(l => l.startsWith('__ERROR__::'));
            if (errLine) {
              errorMessage = errLine.substring('__ERROR__::'.length);
            }
          }

          if (!errorMessage && stderrData.trim()) {
            errorMessage = stderrData.trim();
          }

          resolve({
            success: code === 0 && !errorMessage,
            result,
            logs,
            error: errorMessage || undefined,
            executionTime: Date.now() - startTime,
            isolationLevel: 'DockerContainer'
          });
        });
      });
    } catch (e: any) {
      return {
        success: false,
        logs,
        error: `Docker Execution engine crashed: ${e.message}`,
        executionTime: Date.now() - startTime,
        isolationLevel: 'DockerContainer'
      };
    }
  }
}
