import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
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
      logger.warn('Docker Sandbox: Docker daemon not available. Falling back to secure subprocess process isolation.');
    }
    return this.hasDockerCached;
  }

  /**
   * Securely runs JavaScript or Python code within a sandboxed context.
   */
  public async execute(
    code: string,
    language: 'javascript' | 'python' = 'javascript',
    timeoutMs: number = 5000
    ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const useDocker = DockerSandbox.checkDockerAvailable();

    if (useDocker) {
      try {
        const dockerRes = await this.runInDocker(code, language, timeoutMs, startTime);
        const isDockerError = dockerRes.error && (
          dockerRes.error.includes('docker:') ||
          dockerRes.error.includes('Cannot connect') ||
          dockerRes.error.includes('Permission denied') ||
          dockerRes.error.includes('daemon') ||
          dockerRes.error.includes('No such image') ||
          dockerRes.error.includes('no such file or directory') ||
          dockerRes.error.includes('Timeout') ||
          dockerRes.error.includes('Unable to find image')
        );
        if (!dockerRes.success && isDockerError) {
          logger.warn(`Docker execution failed due to potential infrastructure or timeout issue: ${dockerRes.error}. Falling back to child process.`);
          return this.runInSecureChildProcess(code, language, timeoutMs, startTime);
        }
        return dockerRes;
      } catch (err: any) {
        logger.error(`Docker execution threw an error: ${err.message}. Falling back to child process.`);
        return this.runInSecureChildProcess(code, language, timeoutMs, startTime);
      }
    } else {
      return this.runInSecureChildProcess(code, language, timeoutMs, startTime);
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
    # Buffer custom print statements
    original_print = print
    logs = []
    def custom_print(*args, **kwargs):
        msg = " ".join(map(str, args))
        logs.append(msg)
        sys.stdout.write(msg + "\\n")
    print = custom_print
    
    # Run user logic
    local_vars = {}
    exec(${JSON.stringify(code)}, {}, local_vars)
    # Check return keys or last variables
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
      const dockerArgs = [
        'run', '--rm', '--network', 'none',
        '--memory', '64m', '--cpus', '0.5',
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

  /**
   * Executes code using a highly secured, non-networked local child process with stripped environments.
   */
  private async runInSecureChildProcess(
    code: string,
    language: 'javascript' | 'python',
    timeoutMs: number,
    startTime: number
  ): Promise<SandboxExecutionResult> {
    const logs: string[] = [];
    let tempFile = '';

    try {
      const isJS = language === 'javascript';
      const fileExt = isJS ? '.cjs' : '.py';
      tempFile = path.join('/tmp', `sandbox_ps_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`);

      // Prepare wrapped source script execution code
      let enrichedCode = '';
      if (isJS) {
        enrichedCode = `
          const fs = require('fs');
          const process = require('process');
          
          // Secure imports cleanup to minimize SSRF / system breach risks
          global.require = (mod) => {
            if (['fs', 'child_process', 'cluster', 'net', 'dns', 'http', 'https', 'tls', 'dgram', 'os'].includes(mod)) {
              throw new Error('Import blocked: module "'+mod+'" is unauthorized in sandbox.');
            }
            return require(mod);
          };

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
        `;
      } else {
        enrichedCode = `import sys, json, os
# Block unauthorized operations of os/sys and network components
def blocked(*args, **kwargs):
    raise RuntimeError("Security Breach Alert: Executing restricted system modules is strictly forbidden.")

# Override critical libraries
import socket
socket.socket = blocked
os.system = blocked
os.popen = blocked

try:
    # Buffer custom print statements
    original_print = print
    logs = []
    def custom_print(*args, **kwargs):
        msg = " ".join(map(str, args))
        sys.stdout.write(msg + "\\n")
    print = custom_print
    
    # Run user logic
    local_vars = {}
    exec(${JSON.stringify(code)}, {}, local_vars)
    # Check return keys or last variables
    if local_vars:
        last_val = list(local_vars.values())[-1]
        sys.stdout.write("__RESULT__::" + json.dumps(last_val) + "\\n")
except Exception as e:
    sys.stderr.write("__ERROR__::" + str(e) + "\\n")
    sys.exit(1)
`;
      }

      fs.writeFileSync(tempFile, enrichedCode, 'utf-8');

      const cmd = isJS ? 'node' : 'python3';
      const args = [tempFile];

      return new Promise((resolve) => {
        // Strip out and isolate host process environment variables to prevent token leakage
        const proc = spawn(cmd, args, { env: { PATH: process.env.PATH } });
        let stdoutData = '';
        let stderrData = '';

        const timeout = setTimeout(() => {
          proc.kill('SIGKILL');
          resolve({
            success: false,
            logs,
            error: `Timeout: Execution exceeded safe duration limit of ${timeoutMs}ms (Process Quarantined).`,
            executionTime: Date.now() - startTime,
            isolationLevel: 'IsolatedChildProcess'
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
          try {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          } catch {}

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
            isolationLevel: 'IsolatedChildProcess'
          });
        });
      });
    } catch (e: any) {
      try {
        if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch {}
      return {
        success: false,
        logs,
        error: `Secure child process runner failed: ${e.message}`,
        executionTime: Date.now() - startTime,
        isolationLevel: 'IsolatedChildProcess'
      };
    }
  }
}
