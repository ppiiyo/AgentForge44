#!/usr/bin/env npx tsx
import fs from 'fs';
import path from 'path';
import { StatefulExecutionEngine } from './execution.js';

/**
 * Command Line Interface for KostromAi44.
 * Usage:
 *   npx tsx src/api/cli.ts run ./graph.json --input "key1=value1,key2=value2"
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'run') {
    const graphPath = args[1];
    if (!graphPath) {
      console.error("\x1b[31mError: Please specify the path to your workflow graph.json file.\x1b[0m");
      process.exit(1);
    }

    // Capture dynamic inputs
    let inputs: Record<string, string> = {};
    const inputArgIndex = args.findIndex(a => a === '--input' || a === '-i');
    if (inputArgIndex !== -1 && args[inputArgIndex + 1]) {
      const rawInputs = args[inputArgIndex + 1];
      rawInputs.split(',').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k && v) {
          inputs[k.trim()] = v.trim();
        }
      });
    }

    await runGraphFile(graphPath, inputs);
  } else {
    console.error(`\x1b[31mUnknown command: '${command}'\x1b[0m`);
    printHelp();
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
\x1b[36m██████╗  ██████╗ ███████╗███╗   ██╗████████╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗██╗  ██╗██╗  ██╗
██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝██║  ██║██║  ██║
███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ███████║███████║
██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ╚════██║╚════██║
██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗     ██║     ██║
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝     ╚═╝     ╚═╝\x1b[0m
                                        \x1b[35m[ KostromAi44 CLI Engine v1.0 ]\x1b[0m

  \x1b[1mUsage:\x1b[0m
    kostromai4444 <command> [options]

  \x1b[1mCommands:\x1b[0m
    run <graph_path>  Loads and executes a graph JSON file matching our architectural specs.
    help              Displays this elegant developer help block.

  \x1b[1mOptions:\x1b[0m
    --input, -i       Specify key-value arguments injected into flow (e.g. --input "task=MyTask,language=TypeScript").

  \x1b[1mExamples:\x1b[0m
    npx tsx src/api/cli.ts run ./samples/graph.json --input "language=Python"
  `);
}

async function runGraphFile(filePath: string, inputs: Record<string, string>) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\x1b[31mError: Graph file not found at: ${resolvedPath}\x1b[0m`);
    process.exit(1);
  }

  try {
    const rawContent = fs.readFileSync(resolvedPath, 'utf-8');
    const graphData = JSON.parse(rawContent);

    const nodes = graphData.nodes || [];
    const connections = graphData.connections || [];

    if (nodes.length === 0) {
      throw new Error("Specified workflow graph doesn't contain any execution nodes.");
    }

    console.log(`\x1b[32m✔ Loaded Graph successfully [${nodes.length} nodes, ${connections.length} links]\x1b[0m`);
    console.log(`\x1b[34m🗲 Initializing Headless Execution Pipeline...\x1b[0m\n`);

    const engine = new StatefulExecutionEngine(nodes, connections);
    const result = await engine.runWorkflow(inputs);

    console.log("\x1b[36m========================= STEP PROGRESSION TRACE =========================\x1b[0m");
    result.logs.forEach((log, index) => {
      const icon = log.status === 'completed' ? '🟢' : log.status === 'failed' ? '🔴' : '🟡';
      console.log(`  [Step ${index + 1}] ${icon} ${log.nodeTitle} (${log.duration}ms)`);
      if (log.status === 'failed' && log.output) {
        console.log(`  \x1b[31mError detail: ${log.output}\x1b[0m`);
      }
    });

    console.log("\x1b[36m==========================================================================\x1b[0m\n");
    console.log("\x1b[32m✔ Execution Complete!\x1b[0m");
    console.log(`\x1b[1mTotal Time:\x1b[0m ${result.totalDuration}ms`);
    console.log(`\x1b[1mPayload Output:\x1b[0m \n${result.finalResult}\n`);

  } catch (err: any) {
    console.error("\x1b[31mExecution Interrupted during run:\x1b[0m", err.message || err);
    process.exit(1);
  }
}

// Invoke Main CLI handler
main().catch(err => {
  console.error("General CLI failure:", err);
  process.exit(1);
});
