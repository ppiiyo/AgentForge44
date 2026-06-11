import { GoogleGenAI } from "@google/genai";
import { FlowNode, FlowConnection, PipelineExecutionResult, StepLog } from "../types.js";

function getNextNodeId(nodeId: string, connections: FlowConnection[]): string | null {
  const conn = connections.find(c => c.sourceId === nodeId);
  return conn ? conn.targetId : null;
}

interface RetryResult {
  response: any;
  resolvedModel: string;
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  config: any,
  attempts = 3,
  delayMs = 1500
): Promise<RetryResult> {
  let attemptsLeft = attempts;
  let currentDelay = delayMs;
  let currentModel = model;

  while (attemptsLeft > 0) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: contents,
        config: config
      });
      return { response, resolvedModel: currentModel };
    } catch (err: any) {
      const errMsg = String(err.message || err);
      
      const isQuotaExceeded = 
        errMsg.includes("Quota exceeded") || 
        errMsg.includes("RESOURCE_EXHAUSTED") || 
        errMsg.includes("quota") || 
        errMsg.includes("limit");

      const isTransient = 
        isQuotaExceeded ||
        errMsg.includes("503") || 
        errMsg.includes("UNAVAILABLE") || 
        errMsg.includes("429") || 
        errMsg.includes("high demand") || 
        errMsg.includes("Overloaded") || 
        err.status === 503 || 
        err.status === 429;

      // If it is a hard quota error and we can fall back, do so immediately without wasting delay time!
      if (isQuotaExceeded && (currentModel === 'gemini-3.5-flash' || currentModel === 'gemini-3.1-pro-preview')) {
        const fallbackModel = 'gemini-3.1-flash-lite';
        console.warn(`[AgentForge44] Hard quota limit reached for ${currentModel}. Falling back immediately to ${fallbackModel}...`);
        currentModel = fallbackModel;
        attemptsLeft = 3; // Give the fallback model full run attempts
        currentDelay = delayMs;
        continue;
      }

      attemptsLeft--;
      if (isTransient && attemptsLeft > 0) {
        console.warn(`[AgentForge44] Gemini API status is transient (${errMsg}). Retrying in ${currentDelay}ms... attempts left: ${attemptsLeft}`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= 2;
      } else {
        // Switch model as final effort fallback if attempts are exhausted
        if (currentModel === 'gemini-3.5-flash' || currentModel === 'gemini-3.1-pro-preview') {
          const fallbackModel = 'gemini-3.1-flash-lite';
          console.warn(`[AgentForge44] Fallback activated: switching load from ${currentModel} to ${fallbackModel} due to errors...`);
          currentModel = fallbackModel;
          attemptsLeft = 2; // Give fallback some retry attempts
          currentDelay = delayMs;
          continue;
        }
        throw err;
      }
    }
  }
  throw new Error("Retry logic error: exhausted all loops without return or throw.");
}

export async function executePipeline(
  nodes: FlowNode[],
  connections: FlowConnection[]
): Promise<PipelineExecutionResult> {
  const startTime = Date.now();
  const logs: StepLog[] = [];
  
  // 1. Setup the Gemini AI Instance
  const apiKey = process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Find start nodes (input nodes)
  const inputNodes = nodes.filter(n => n.type === 'input');
  if (inputNodes.length === 0) {
    throw new Error("No Input node found in the workflow!");
  }

  let currentNodeId: string | null = inputNodes[0].id;
  let activeValue: any = {}; // Holds running variable map or intermediate text states
  let isLooping = false;

  // Track path to prevent infinite loops
  const visited = new Set<string>();

  while (currentNodeId) {
    if (visited.has(currentNodeId)) {
      // Prevent cycle hanging
      break;
    }
    visited.add(currentNodeId);

    const node = nodes.find(n => n.id === currentNodeId);
    if (!node) break;

    const stepStart = Date.now();
    
    try {
      if (node.type === 'input') {
        // Collect inputs into a variable dictionary
        const variablesMap: Record<string, string> = {};
        const variables = node.fields.variables || [];
        variables.forEach((v: { key: string; value: string }) => {
          if (v.key) {
            variablesMap[v.key] = v.value;
          }
        });
        activeValue = variablesMap;

        logs.push({
          nodeId: node.id,
          nodeTitle: node.title,
          status: 'completed',
          input: JSON.stringify(variables, null, 2),
          output: JSON.stringify(variablesMap, null, 2),
          duration: Date.now() - stepStart
        });

      } else if (node.type === 'prompt') {
        const template = node.fields.template || "";
        let renderedPrompt = template;

        // Replace all {placeholder} values with values from activeValue variable map
        if (typeof activeValue === 'object' && activeValue !== null) {
          Object.entries(activeValue).forEach(([key, val]) => {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            renderedPrompt = renderedPrompt.replace(regex, String(val));
          });
        }

        activeValue = renderedPrompt;

        logs.push({
          nodeId: node.id,
          nodeTitle: node.title,
          status: 'completed',
          input: template,
          output: renderedPrompt,
          duration: Date.now() - stepStart
        });

      } else if (node.type === 'gemini') {
        const promptText = typeof activeValue === 'string' ? activeValue : JSON.stringify(activeValue);
        const model = node.fields.model || 'gemini-3.5-flash';
        const temp = Number(node.fields.temperature) ?? 0.7;
        const systemInstruction = node.fields.systemInstruction || "";
        const useSearchGrounding = !!node.fields.useSearchGrounding;

        if (!apiKey) {
          throw new Error("Gemini API key is missing. Please configure GEMINI_API_KEY in Settings > Secrets.");
        }

        // Configure call tools based on search grounding flag
        const config: any = {
          temperature: temp,
          systemInstruction: systemInstruction || undefined,
        };

        if (useSearchGrounding) {
          config.tools = [{ googleSearch: {} }];
        }

        const { response, resolvedModel } = await generateWithRetry(ai, model, promptText, config);

        const responseText = response.text || "";
        activeValue = responseText;

        // Parse search grounding links if present
        const groundingSources: Array<{ title: string; uri: string }> = [];
        const metadata = response.candidates?.[0]?.groundingMetadata;
        if (metadata?.groundingChunks) {
          metadata.groundingChunks.forEach(chunk => {
            if (chunk.web?.title && chunk.web?.uri) {
              groundingSources.push({
                title: chunk.web.title,
                uri: chunk.web.uri
              });
            }
          });
        }

        logs.push({
          nodeId: node.id,
          nodeTitle: `${node.title} (${resolvedModel})`,
          status: 'completed',
          input: promptText,
          output: responseText,
          groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
          duration: Date.now() - stepStart
        });

      } else if (node.type === 'reviewer') {
        const criteria = node.fields.criteria || "";
        const maxIterations = Math.max(1, Number(node.fields.maxIterations) || 1);
        const codeText = typeof activeValue === 'string' ? activeValue : JSON.stringify(activeValue);

        if (!apiKey) {
          throw new Error("Gemini API key is missing. Please configure GEMINI_API_KEY.");
        }

        let runText = codeText;
        let iteration = 0;
        let critiqueResponse = "";
        let passed = false;

        while (iteration < maxIterations && !passed) {
          iteration++;
          
          // Let AI critique the output code or layout against criteria
          const reviewerPrompt = `Analyze the following content generated by our coding unit against these strict quality requirements:
Requirements: "${criteria}"

Content to analyze:
\`\`\`
${runText}
\`\`\`

If it perfectly matches, output exactly "PASS".
If it fails any criteria, explain details & write exactly "FAIL [explanation]", then outline the precise suggestions for correct output.`;

          const { response, resolvedModel: critiqueModel } = await generateWithRetry(
            ai,
            'gemini-3.5-flash',
            reviewerPrompt,
            {
              temperature: 0.1,
              systemInstruction: "You are an automated strict unit testing system and layout auditor."
            }
          );

          critiqueResponse = response.text || "";
          
          if (critiqueResponse.trim().startsWith("PASS")) {
            passed = true;
            break;
          } else {
            // It failed! Hook back into a prompt to refine the output
            const correctionPrompt = `A code/text critique was returned:
Critic critique: ${critiqueResponse}

Please regenerate the output from scratch, integrating all criticisms. Maintain high standards. No introductions, only the final polished code.`;

            const { response: correctionRes, resolvedModel: correctionModel } = await generateWithRetry(
              ai,
              'gemini-3.5-flash',
              `${codeText}\n\n${correctionPrompt}`,
              {
                temperature: 0.2,
                systemInstruction: "You are a self-healing master developer unit."
              }
            );

            runText = correctionRes.text || "";
          }
        }

        activeValue = runText;
        
        logs.push({
          nodeId: node.id,
          nodeTitle: node.title,
          status: 'completed',
          input: `Criteria: ${criteria}`,
          output: passed 
            ? `Passed audit successfully after ${iteration} iterations!\n\n${critiqueResponse}` 
            : `Audit completed maximum cycles (${iteration}). Output refined iteratively with critique:\n\n${critiqueResponse}`,
          iterationCount: iteration,
          duration: Date.now() - stepStart
        });

      } else if (node.type === 'output') {
        const finalStr = typeof activeValue === 'string' ? activeValue : JSON.stringify(activeValue, null, 2);
        
        logs.push({
          nodeId: node.id,
          nodeTitle: node.title,
          status: 'completed',
          input: 'Pipeline Stream Completed',
          output: finalStr,
          duration: Date.now() - stepStart
        });
      }

    } catch (err: any) {
      logs.push({
        nodeId: node.id,
        nodeTitle: node.title,
        status: 'failed',
        input: 'Execution Interrupted',
        output: err.message || String(err),
        duration: Date.now() - stepStart
      });
      throw err;
    }

    // Advance to next link in connections
    currentNodeId = getNextNodeId(currentNodeId, connections);
  }

  const finalResultNode = nodes.find(n => n.type === 'output');
  const finalResultText = typeof activeValue === 'string' ? activeValue : JSON.stringify(activeValue, null, 2);

  return {
    logs: logs,
    finalResult: finalResultText,
    totalDuration: Date.now() - startTime
  };
}
