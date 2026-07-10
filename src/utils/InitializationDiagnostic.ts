import fs from 'fs';
import path from 'path';
import net from 'net';

export interface DependencyCheckDetail {
  name: string;
  status: 'installed' | 'missing';
  version?: string;
  error?: string;
}

export interface JsonConfigCheckDetail {
  filepath: string;
  status: 'valid' | 'invalid' | 'missing';
  error?: string;
}

export interface PortCheckDetail {
  port: number;
  status: 'free' | 'busy' | 'occupied_by_self';
  description: string;
}

export interface DiagnosticResult {
  timestamp: string;
  success: boolean;
  checks: {
    dependencies: {
      status: 'ok' | 'error';
      details: DependencyCheckDetail[];
    };
    jsonConfigs: {
      status: 'ok' | 'error';
      details: JsonConfigCheckDetail[];
    };
    ports: {
      status: 'ok' | 'error';
      details: PortCheckDetail[];
    };
  };
}

/**
 * Checks if a TCP port is currently in use or free.
 */
function checkPort(port: number, host: string = '0.0.0.0'): Promise<'free' | 'busy'> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: any) => {
      resolve('busy');
    });
    server.once('listening', () => {
      server.close(() => {
        resolve('free');
      });
    });
    server.listen(port, host);
  });
}

/**
 * Runs the full suite of diagnostic checks on the current environment.
 */
export async function runInitializationDiagnostic(): Promise<DiagnosticResult> {
  const timestamp = new Date().toISOString();
  
  // 1. Core dependencies check
  const depsToCheck = [
    '@google/genai',
    'express',
    'drizzle-orm',
    'socket.io',
    'dotenv',
    'tsx',
    'vite',
    'framer-motion'
  ];
  
  const depDetails: DependencyCheckDetail[] = [];
  let packageJson: any = null;
  
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    }
  } catch (err: any) {
    // handled in json check
  }

  for (const dep of depsToCheck) {
    try {
      // Check if installed in node_modules
      const depPkgPath = path.join(process.cwd(), 'node_modules', dep, 'package.json');
      if (fs.existsSync(depPkgPath)) {
        const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
        depDetails.push({
          name: dep,
          status: 'installed',
          version: depPkg.version || 'unknown'
        });
      } else {
        // Fallback checks
        const declaredVersion = packageJson?.dependencies?.[dep] || packageJson?.devDependencies?.[dep];
        if (declaredVersion) {
          depDetails.push({
            name: dep,
            status: 'missing',
            version: undefined,
            error: `Declared in package.json as ${declaredVersion} but folder missing from node_modules. Please run npm install.`
          });
        } else {
          depDetails.push({
            name: dep,
            status: 'missing',
            error: 'Not declared in package.json and not found in node_modules.'
          });
        }
      }
    } catch (err: any) {
      depDetails.push({
        name: dep,
        status: 'missing',
        error: err.message || String(err)
      });
    }
  }

  const dependenciesStatus = depDetails.some(d => d.status === 'missing') ? 'error' : 'ok';

  // 2. Invalid JSON config files check
  const jsonFiles = [
    'package.json',
    'tsconfig.json',
    'drizzle.config.json',
    'metadata.json',
    '.versionrc.json'
  ];

  const jsonDetails: JsonConfigCheckDetail[] = [];

  for (const file of jsonFiles) {
    const filepath = path.join(process.cwd(), file);
    if (!fs.existsSync(filepath)) {
      // some configs like drizzle.config.json or .versionrc.json might be optional/missing but let's check
      jsonDetails.push({
        filepath: file,
        status: 'missing',
        error: 'File does not exist in the root workspace.'
      });
      continue;
    }

    try {
      const content = fs.readFileSync(filepath, 'utf8');
      // Simple custom comment stripper to handle tsconfig.json with comments
      let cleanContent = content;
      if (file === 'tsconfig.json') {
        cleanContent = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
      }
      JSON.parse(cleanContent);
      jsonDetails.push({
        filepath: file,
        status: 'valid'
      });
    } catch (err: any) {
      jsonDetails.push({
        filepath: file,
        status: 'invalid',
        error: err.message || 'Invalid JSON syntax'
      });
    }
  }

  const jsonConfigsStatus = jsonDetails.some(j => j.status === 'invalid') ? 'error' : 'ok';

  // 3. Port check (detect if port 3000 is occupied by us or conflicts)
  const portDetails: PortCheckDetail[] = [];
  const portsToCheck = [3000, 5173, 24678]; // Express standard, Vite HMR or other dev servers

  for (const p of portsToCheck) {
    const result = await checkPort(p);
    if (p === 3000) {
      // Port 3000 is expected to be busy by current process
      portDetails.push({
        port: p,
        status: result === 'busy' ? 'occupied_by_self' : 'free',
        description: result === 'busy' 
          ? `Port 3000 is active. Running on process PID ${process.pid} (KostromAi44 main server).`
          : 'Port 3000 is surprisingly free (this diagnostics endpoint should be running on it).'
      });
    } else {
      portDetails.push({
        port: p,
        status: result === 'busy' ? 'busy' : 'free',
        description: result === 'busy'
          ? `Port ${p} is currently occupied by another active microservice or HMR listener.`
          : `Port ${p} is free and ready for binding.`
      });
    }
  }

  const portsStatus = 'ok'; // Port 3000 being busy is expected

  const overallSuccess = dependenciesStatus === 'ok' && jsonConfigsStatus === 'ok';

  return {
    timestamp,
    success: overallSuccess,
    checks: {
      dependencies: {
        status: dependenciesStatus,
        details: depDetails
      },
      jsonConfigs: {
        status: jsonConfigsStatus,
        details: jsonDetails
      },
      ports: {
        status: portsStatus,
        details: portDetails
      }
    }
  };
}
