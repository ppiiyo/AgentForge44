#!/usr/bin/env node

import { executeCliRunCommand } from "./commands/run.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "run") {
    const graphFile = args[1];
    if (!graphFile) {
      console.error("Error: Please specify the graph json config path. (e.g. agentforge run ./my-graph.json)");
      process.exit(1);
    }

    const inputIdx = args.indexOf("--input");
    const outputIdx = args.indexOf("--output");

    const inputVal = inputIdx !== -1 ? args[inputIdx + 1] : undefined;
    const outputVal = outputIdx !== -1 ? args[outputIdx + 1] : undefined;

    try {
      await executeCliRunCommand(graphFile, { input: inputVal, output: outputVal });
    } catch (err: any) {
      console.error("CLI Execution failed with error:", err.message);
      process.exit(1);
    }
  } else if (command === "serve") {
    console.log("[AgentForge CLI] Starting local headless API engine on port 3000...");
    // Will run default express boot mapping
  } else {
    console.error(`Unknown Command error: ${command}`);
    printHelp();
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
AgentForge CLI - Visual Multi-Agent Workflows Engine

Usage:
  agentforge <command> [arguments]

Commands:
  run <config_path>     Execute the stateful visual model directly from command line.
     --input <string>   Assign arbitrary values initialization
     --output <path>    Export resulting traces log schema JSON to target path
  serve                 Spin up regional backends local daemon process API
  `);
}

main();
