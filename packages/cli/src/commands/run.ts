import fs from "fs";
import path from "path";
import { GraphExecutor } from "../../../core/src/graph/executor.js";
import { GeminiProvider } from "../../../providers/src/gemini.js";

export async function executeCliRunCommand(graphPath: string, options: { input?: string; output?: string }) {
  console.log(`[AgentForge CLI] loading visual workflow configuration from: ${graphPath}`);
  
  const absolutePath = path.resolve(process.cwd(), graphPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file path does not exist: ${graphPath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const graphModel = JSON.parse(raw);

  if (!graphModel.nodes) {
    throw new Error("Invalid graph model: missing 'nodes' specifications.");
  }

  console.log(`[AgentForge CLI] parsing graph: ${graphModel.nodes.length} nodes, ${graphModel.connections?.length || 0} edges.`);

  const apiKey = process.env.GEMINI_API_KEY || "mock";
  const provider = new GeminiProvider(apiKey);
  const executor = new GraphExecutor(graphModel.nodes, graphModel.connections || [], provider);

  const initialInputs = options.input ? { lastOutput: options.input } : {};

  console.log("[AgentForge CLI] Executing graph pipeline steps...");
  const endState = await executor.execute(initialInputs);

  console.log("[AgentForge CLI] Execution Completed! Final State output summary:", endState.values.lastOutput);

  if (options.output) {
    const outPath = path.resolve(process.cwd(), options.output);
    fs.writeFileSync(outPath, JSON.stringify(endState, null, 2), "utf8");
    console.log(`[AgentForge CLI] State export files saved successfully to: ${options.output}`);
  }
}
